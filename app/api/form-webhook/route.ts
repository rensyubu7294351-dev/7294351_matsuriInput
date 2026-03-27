import { NextRequest, NextResponse } from "next/server";
import { findMemberByNickname, logSent } from "@/lib/google-sheets";
import { getFestivalConfigById } from "@/lib/festival-config";
import { sendInviteLink, InviteType } from "@/lib/line-push";

// Google Apps Script からのWebhookシークレット検証
function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-webhook-secret");
  return secret === process.env.APPS_SCRIPT_WEBHOOK_SECRET;
}

function resolveInviteType(status: string): InviteType | null {
  if (status === "参加") return "participation";
  if (status === "保留（参加より）" || status === "保留（不参加より）") return "pending";
  return null; // 不参加など、送信不要
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { festivalId, nickname, status } = body;

  if (!festivalId || !nickname || !status) {
    return NextResponse.json({ error: "festivalId, nickname, status are required" }, { status: 400 });
  }

  const inviteType = resolveInviteType(status);
  if (!inviteType) {
    // 不参加は送信不要
    return NextResponse.json({ skipped: true, reason: "no invite needed for this status" });
  }

  const [config, member] = await Promise.all([
    getFestivalConfigById(festivalId),
    findMemberByNickname(nickname),
  ]);

  if (!config) {
    return NextResponse.json({ error: `Festival config not found: ${festivalId}` }, { status: 404 });
  }

  if (!member || !member.lineUserId) {
    // LINE IDが未登録 → ログだけ残して後でCronが再試行
    return NextResponse.json({ skipped: true, reason: "LINE user ID not registered", nickname });
  }

  await sendInviteLink(
    member.lineUserId,
    inviteType,
    config.participationGroupLink,
    config.pendingGroupLink,
    config.festivalName
  );

  await logSent({
    festivalId,
    nickname,
    lineUserId: member.lineUserId,
    status,
    sentAt: new Date().toISOString(),
    linkType: inviteType,
  });

  return NextResponse.json({ success: true, nickname, inviteType });
}
