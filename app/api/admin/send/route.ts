import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import {
  getAttendanceRecords,
  findMemberByNickname,
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
    getSentLog(festivalId),
  ]);

  const sentMap = new Map(sentLog.map((s) => [s.nickname, s]));

  const summary = records.map((r) => ({
    nickname: r.nickname,
    fullName: r.fullName,
    status: r.status,
    inviteType: resolveInviteType(r.status),
    sent: sentMap.has(r.nickname),
    sentAt: sentMap.get(r.nickname)?.sentAt ?? null,
  }));

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
    getSentLog(festivalId),
  ]);

  const sentNicknames = new Set(sentLog.map((s) => s.nickname));
  const targets = nickname
    ? records.filter((r) => r.nickname === nickname)
    : records;

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const record of targets) {
    const inviteType = resolveInviteType(record.status);
    if (!inviteType) { skipped++; continue; }
    if (sentNicknames.has(record.nickname) && !nickname) {
      // 一括送信では送済みをスキップ、個別送信は強制再送
      skipped++;
      continue;
    }

    const member = await findMemberByNickname(record.nickname);
    if (!member?.lineUserId) {
      errors.push(`LINE ID未登録: ${record.nickname}`);
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
        festivalId,
        nickname: record.nickname,
        lineUserId: member.lineUserId,
        status: record.status,
        sentAt: new Date().toISOString(),
        linkType: inviteType,
      });
      sent++;
    } catch (e) {
      errors.push(`送信失敗 ${record.nickname}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}
