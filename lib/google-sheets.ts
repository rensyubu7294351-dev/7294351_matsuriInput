import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
  });
}

export async function getSheetValues(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return (res.data.values as string[][]) ?? [];
}

export async function appendSheetRow(
  spreadsheetId: string,
  range: string,
  values: string[]
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [values] },
  });
}

export async function updateSheetCell(
  spreadsheetId: string,
  range: string,
  value: string
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [[value]] },
  });
}

// ---- メンバーシート操作 ----

const MEMBERS_SHEET_ID = process.env.MEMBERS_SPREADSHEET_ID!;
const MEMBERS_RANGE = "メンバー!A:D"; // あだ名, 氏名, LINE user ID, 登録日時

export interface Member {
  nickname: string;
  fullName: string;
  lineUserId: string;
  registeredAt: string;
}

export async function getMembers(): Promise<Member[]> {
  const rows = await getSheetValues(MEMBERS_SHEET_ID, MEMBERS_RANGE);
  // 1行目はヘッダー
  return rows.slice(1).map((row) => ({
    nickname: row[0] ?? "",
    fullName: row[1] ?? "",
    lineUserId: row[2] ?? "",
    registeredAt: row[3] ?? "",
  }));
}

export async function findMemberByNickname(
  nickname: string
): Promise<Member | undefined> {
  const members = await getMembers();
  return members.find(
    (m) => m.nickname.trim() === nickname.trim()
  );
}

export async function findMemberByLineUserId(
  lineUserId: string
): Promise<Member | undefined> {
  const members = await getMembers();
  return members.find((m) => m.lineUserId === lineUserId);
}

export async function registerMember(member: Omit<Member, "registeredAt">): Promise<void> {
  const registeredAt = new Date().toISOString();
  await appendSheetRow(MEMBERS_SHEET_ID, "メンバー!A:D", [
    member.nickname,
    member.fullName,
    member.lineUserId,
    registeredAt,
  ]);
}

// ---- 出欠シート操作（読み取り専用） ----
// 列定義: A=タイムスタンプ, B=メール, C=あだ名, D=氏名, E=ファミリー,
//         F=振り(1つ目), G=振り(2つ目), H=参加・不参加, I=絶対練, J=不参加理由,
//         K=再送チェック, L=備考欄

export type AttendanceStatus = "参加" | "保留（参加より）" | "保留（不参加より）" | string;

export interface AttendanceRecord {
  row: number;      // 行番号（1始まり）
  timestamp: string;
  email: string;
  nickname: string;
  fullName: string;
  family: string;
  dance1: string;
  dance2: string;
  status: AttendanceStatus;
  absolutePractice: string;
  absenceReason: string;
  isResend: string;
  notes: string;
}

export async function getAttendanceRecords(
  spreadsheetId: string
): Promise<AttendanceRecord[]> {
  // A列からL列を取得（列番号で参照。F列G列は同名「振り」のため列番号必須）
  const rows = await getSheetValues(spreadsheetId, "フォームの回答 1!A:L");
  return rows.slice(1).map((row, i) => ({
    row: i + 2,
    timestamp: row[0] ?? "",
    email: row[1] ?? "",
    nickname: row[2] ?? "",
    fullName: row[3] ?? "",
    family: row[4] ?? "",
    dance1: row[5] ?? "",
    dance2: row[6] ?? "",
    status: row[7] ?? "",
    absolutePractice: row[8] ?? "",
    absenceReason: row[9] ?? "",
    isResend: row[10] ?? "",
    notes: row[11] ?? "",
  }));
}

// ---- 各祭りスプレッドシート内の送信管理シート ----
// 行1-4: 祭り設定情報、行5: 空、行6: ヘッダー、行7以降: データ

export interface SentLogEntry {
  nickname: string;
  status: string;
  sentAt: string;
  linkType: "participation" | "pending";
}

export async function getSentLog(festivalSpreadsheetId: string): Promise<SentLogEntry[]> {
  try {
    const rows = await getSheetValues(festivalSpreadsheetId, "送信管理!A:D");
    // 先頭6行はヘッダーエリア（行7以降がデータ）
    return rows
      .slice(6)
      .filter((row) => row[0])
      .map((row) => ({
        nickname: row[0] ?? "",
        status: row[1] ?? "",
        sentAt: row[2] ?? "",
        linkType: (row[3] ?? "participation") as "participation" | "pending",
      }));
  } catch {
    return [];
  }
}

export async function logSent(entry: SentLogEntry, festivalSpreadsheetId: string): Promise<void> {
  await appendSheetRow(festivalSpreadsheetId, "送信管理!A:D", [
    entry.nickname,
    entry.status,
    entry.sentAt,
    entry.linkType,
  ]);
}

export async function initFestivalSentSheet(
  festivalSpreadsheetId: string,
  config: {
    festivalName: string;
    deadline: string;
    participationGroupLink: string;
    pendingGroupLink: string;
  }
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // シート存在確認
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: festivalSpreadsheetId });
  const existingTitles = (spreadsheet.data.sheets ?? []).map((s) => s.properties?.title ?? "");

  if (!existingTitles.includes("送信管理")) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: festivalSpreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: "送信管理" } } }] },
    });
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: festivalSpreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "送信管理!A1:B1", values: [["祭り名", config.festivalName]] },
        { range: "送信管理!A2:B2", values: [["回答期日", config.deadline]] },
        { range: "送信管理!A3:B3", values: [["参加グループリンク", config.participationGroupLink]] },
        { range: "送信管理!A4:B4", values: [["保留グループリンク", config.pendingGroupLink]] },
        { range: "送信管理!A6:D6", values: [["あだ名", "参加状況", "送信日時", "リンク種別"]] },
      ],
    },
  });
}

export async function updateFestivalSentSheetConfig(
  festivalSpreadsheetId: string,
  config: {
    festivalName: string;
    deadline: string;
    participationGroupLink: string;
    pendingGroupLink: string;
  }
): Promise<void> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: festivalSpreadsheetId,
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: "送信管理!B1", values: [[config.festivalName]] },
        { range: "送信管理!B2", values: [[config.deadline]] },
        { range: "送信管理!B3", values: [[config.participationGroupLink]] },
        { range: "送信管理!B4", values: [[config.pendingGroupLink]] },
      ],
    },
  });
}
