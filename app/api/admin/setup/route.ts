import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { verifySessionToken } from "@/lib/auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return verifySessionToken(session);
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

// シートが既に存在するか確認
async function getExistingSheetTitles(spreadsheetId: string): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return (res.data.sheets ?? []).map((s) => s.properties?.title ?? "");
}

const SHEET_DEFINITIONS = [
  {
    title: "メンバー",
    headers: ["あだ名", "氏名", "LINEユーザーID", "登録日時"],
  },
  {
    title: "祭り設定",
    headers: ["ID", "祭り名", "スプレッドシートID", "参加グループリンク", "保留グループリンク", "回答期日", "ドライブフォルダURL", "作成日時"],
  },
  {
    title: "グループ参加ログ",
    headers: ["グループID", "LINEユーザーID", "参加日時"],
  },
];

// GET: セットアップ状態を確認
export async function GET() {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spreadsheetId = process.env.MEMBERS_SPREADSHEET_ID;
  if (!spreadsheetId || spreadsheetId === "your-members-spreadsheet-id") {
    return NextResponse.json({
      ready: false,
      reason: "MEMBERS_SPREADSHEET_ID が設定されていません",
    });
  }

  try {
    const existingTitles = await getExistingSheetTitles(spreadsheetId);
    const missingSheets = SHEET_DEFINITIONS.filter((d) => !existingTitles.includes(d.title));
    return NextResponse.json({
      ready: missingSheets.length === 0,
      existingSheets: existingTitles,
      missingSheets: missingSheets.map((s) => s.title),
      spreadsheetId,
    });
  } catch (e) {
    return NextResponse.json({
      ready: false,
      reason: `スプレッドシートにアクセスできません: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

// POST: シートを初期化する
export async function POST(req: NextRequest) {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const spreadsheetId = process.env.MEMBERS_SPREADSHEET_ID;
  if (!spreadsheetId || spreadsheetId === "your-members-spreadsheet-id") {
    return NextResponse.json({ error: "MEMBERS_SPREADSHEET_ID が設定されていません" }, { status: 400 });
  }

  const sheets = getSheetsClient();
  const existingTitles = await getExistingSheetTitles(spreadsheetId);
  const created: string[] = [];

  for (const def of SHEET_DEFINITIONS) {
    if (!existingTitles.includes(def.title)) {
      // シートを追加
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: def.title } } }],
        },
      });
      created.push(def.title);
    }

    // ヘッダー行を書き込む（1行目が空の場合のみ）
    const range = `${def.title}!A1:${String.fromCharCode(64 + def.headers.length)}1`;
    const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    if (!existing.data.values?.[0]) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: { values: [def.headers] },
      });
    }
  }

  return NextResponse.json({
    success: true,
    created,
    message: created.length > 0
      ? `シートを作成しました: ${created.join(", ")}`
      : "全シートは既に存在しています",
  });
}
