import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import {
  getAttendanceRecords,
  findMemberByEmail,
  getSentLog,
  logSent,
} from "@/lib/google-sheets";
import { getFestivalConfigById } from "@/lib/festival-config";
import { sendInviteLink, InviteType } from "@/lib/line-push";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return verifySessionToken(session);
}

function resolveInviteType(status: string): InviteType | null {
  if (status === "参加") return "participation";
  if (status === "保留（参加より）" || status === "保留（不参加より）") return "pending";
  return null;
}

// GET: 送信状況一覧
export async function GET(req: NextRequest) {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const festivalId = req.nextUrl.searchParams.get("festivalId");
  if (!festivalId) return NextResponse.json({ error: "festivalId is required" }, { status: 400 });

  const config = await getFestivalConfigById(festivalId);
  if (!config) return NextResponse.json({ error: "Festival not found" }, { status: 404 });

  const [records, sentLog] = await Promise.all([
    getAttendanceRecords(config.spreadsheetId),
    getSentLog(config.spreadsheetId),
  ]);

  const sentMap = new Map(sentLog.map((s) => [s.email, s]));

  const summary = records.map((r) => {
    const email = r.email.trim().toLowerCase();
    return {
      nickname: r.nickname,
      fullName: r.fullName,
      status: r.status,
      inviteType: resolveInviteType(r.status),
      sent: sentMap.has(email),
      sentAt: sentMap.get(email)?.sentAt ?? null,
    };
  });

  return NextResponse.json(summary);
}

// POST: 手動送信（個別または一括）
export async function POST(req: NextRequest) {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { festivalId, nickname } = await req.json();
  if (!festivalId) return NextResponse.json({ error: "festivalId is required" }, { status: 400 });

  const config = await getFestivalConfigById(festivalId);
  if (!config) return NextResponse.json({ error: "Festival not found" }, { status: 404 });

  const [records, sentLog] = await Promise.all([
    getAttendanceRecords(config.spreadsheetId),
    getSentLog(config.spreadsheetId),
  ]);

  const sentEmails = new Set(sentLog.map((s) => s.email));
  const targets = nickname
    ? records.filter((r) => r.nickname === nickname)
    : records;

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const record of targets) {
    const inviteType = resolveInviteType(record.status);
    if (!inviteType) { skipped++; continue; }
    const recordEmail = record.email.trim().toLowerCase();
    if (!recordEmail) { errors.push(`メール未記入: ${record.nickname}`); continue; }
    if (sentEmails.has(recordEmail) && !nickname) {
      skipped++;
      continue;
    }

    const member = await findMemberByEmail(recordEmail);
    if (!member?.lineUserId) {
      errors.push(`LINE ID未登録: ${record.email}`);
      continue;
    }

    try {
      await sendInviteLink(
        member.lineUserId,
        inviteType,
        config.participationGroupLink,
        config.pendingGroupLink,
        config.festivalName
      );
      await logSent({
        email: recordEmail,
        status: record.status,
        sentAt: new Date().toISOString(),
        linkType: inviteType,
      }, config.spreadsheetId);
      sent++;
    } catch (e) {
      errors.push(`送信失敗 ${record.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}
