import { google } from "googleapis";
import { getSheetValues, appendSheetRow, initFestivalSentSheet, updateFestivalSentSheetConfig } from "./google-sheets";

const MEMBERS_SHEET_ID = process.env.MEMBERS_SPREADSHEET_ID!;
const CONFIG_RANGE = "祭り設定!A:J";

export interface FestivalConfig {
  id: string;
  festivalName: string;
  spreadsheetId: string;
  participationGroupLink: string;
  pendingGroupLink: string;
  deadline: string;
  driveFolderUrl: string;
  createdAt: string;
  participationGroupId: string;
  pendingGroupId: string;
}

export async function getFestivalConfigs(): Promise<FestivalConfig[]> {
  const rows = await getSheetValues(MEMBERS_SHEET_ID, CONFIG_RANGE);
  return rows.slice(1).map((row) => ({
    id: row[0] ?? "",
    festivalName: row[1] ?? "",
    spreadsheetId: row[2] ?? "",
    participationGroupLink: row[3] ?? "",
    pendingGroupLink: row[4] ?? "",
    deadline: row[5] ?? "",
    driveFolderUrl: row[6] ?? "",
    createdAt: row[7] ?? "",
    participationGroupId: (row[8] ?? "").trim(),
    pendingGroupId: (row[9] ?? "").trim(),
  }));
}

export async function getFestivalConfigById(
  id: string
): Promise<FestivalConfig | undefined> {
  const configs = await getFestivalConfigs();
  return configs.find((c) => c.id === id);
}

export async function getFestivalConfigBySpreadsheetId(
  spreadsheetId: string
): Promise<FestivalConfig | undefined> {
  const configs = await getFestivalConfigs();
  return configs.find((c) => c.spreadsheetId === spreadsheetId);
}

export async function saveFestivalConfig(
  config: Omit<FestivalConfig, "id" | "createdAt">
): Promise<FestivalConfig> {
  const id = `festival-${Date.now()}`;
  const createdAt = new Date().toISOString();
  await appendSheetRow(MEMBERS_SHEET_ID, CONFIG_RANGE, [
    id,
    config.festivalName,
    config.spreadsheetId,
    config.participationGroupLink,
    config.pendingGroupLink,
    config.deadline,
    config.driveFolderUrl,
    createdAt,
    "",
    "",
  ]);

  await initFestivalSentSheet(config.spreadsheetId, {
    festivalName: config.festivalName,
    deadline: config.deadline,
    participationGroupLink: config.participationGroupLink,
    pendingGroupLink: config.pendingGroupLink,
  });

  return { id, ...config, createdAt };
}

function getSheetsClient() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function updateFestivalConfig(
  config: FestivalConfig
): Promise<void> {
  const rows = await getSheetValues(MEMBERS_SHEET_ID, CONFIG_RANGE);
  const rowIndex = rows.findIndex((row) => row[0] === config.id);
  if (rowIndex === -1) throw new Error(`Festival config not found: ${config.id}`);
  const sheetRow = rowIndex + 1;

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: MEMBERS_SHEET_ID,
    range: `祭り設定!A${sheetRow}:J${sheetRow}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        config.id,
        config.festivalName,
        config.spreadsheetId,
        config.participationGroupLink,
        config.pendingGroupLink,
        config.deadline,
        config.driveFolderUrl,
        config.createdAt,
        config.participationGroupId ?? "",
        config.pendingGroupId ?? "",
      ]],
    },
  });

  try {
    await updateFestivalSentSheetConfig(config.spreadsheetId, {
      festivalName: config.festivalName,
      deadline: config.deadline,
      participationGroupLink: config.participationGroupLink,
      pendingGroupLink: config.pendingGroupLink,
    });
  } catch {
    // 送信管理シートが未作成の場合はスキップ（祭り設定の保存は成功扱い）
  }
}

export async function deleteFestivalConfig(id: string): Promise<void> {
  const rows = await getSheetValues(MEMBERS_SHEET_ID, CONFIG_RANGE);
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) throw new Error(`Festival config not found: ${id}`);
  const sheetRow = rowIndex + 1;

  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: MEMBERS_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: await getSheetId(sheets, MEMBERS_SHEET_ID, "祭り設定"),
            dimension: "ROWS",
            startIndex: sheetRow - 1,
            endIndex: sheetRow,
          },
        },
      }],
    },
  });
}

async function getSheetId(sheets: ReturnType<typeof getSheetsClient>, spreadsheetId: string, title: string): Promise<number> {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = (res.data.sheets ?? []).find((s) => s.properties?.title === title);
  if (!sheet) throw new Error(`Sheet not found: ${title}`);
  return sheet.properties!.sheetId!;
}

/** 今日（JST）が期日翌日になっている祭りを返す */
export async function getFestivalsForTodaySend(): Promise<FestivalConfig[]> {
  const configs = await getFestivalConfigs();
  // VercelはUTC動作のため+9時間でJSTの今日の日付を取得
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayJST = nowJST.toISOString().slice(0, 10);
  return configs.filter((c) => {
    if (!c.deadline) return false;
    // deadline は "YYYY-MM-DD HH:mm" 形式（JST）、日付部分だけ使用
    const deadlineDateJST = c.deadline.slice(0, 10);
    const deadlinePlus1 = new Date(deadlineDateJST);
    deadlinePlus1.setDate(deadlinePlus1.getDate() + 1);
    return deadlinePlus1.toISOString().slice(0, 10) === todayJST;
  });
}
