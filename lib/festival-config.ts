import { google } from "googleapis";
import { getSheetValues, appendSheetRow } from "./google-sheets";

const MEMBERS_SHEET_ID = process.env.MEMBERS_SPREADSHEET_ID!;
const CONFIG_RANGE = "祭り設定!A:H";

export interface FestivalConfig {
  id: string;
  festivalName: string;
  spreadsheetId: string;
  participationGroupLink: string;
  pendingGroupLink: string;
  deadline: string;
  driveFolderUrl: string;
  createdAt: string;
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
  }));
}

export async function getFestivalConfigById(
  id: string
): Promise<FestivalConfig | undefined> {
  const configs = await getFestivalConfigs();
  return configs.find((c) => c.id === id);
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
  ]);
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
    range: `祭り設定!A${sheetRow}:H${sheetRow}`,
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
      ]],
    },
  });
}

/** 今日が期日翌日になっている祭りを返す */
export async function getFestivalsForTodaySend(): Promise<FestivalConfig[]> {
  const configs = await getFestivalConfigs();
  const today = new Date().toISOString().slice(0, 10);
  return configs.filter((c) => {
    if (!c.deadline) return false;
    const deadlinePlus1 = new Date(c.deadline);
    deadlinePlus1.setDate(deadlinePlus1.getDate() + 1);
    return deadlinePlus1.toISOString().slice(0, 10) === today;
  });
}
