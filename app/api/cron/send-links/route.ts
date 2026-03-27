import { NextRequest, NextResponse } from "next/server";
import { getAttendanceRecords, findMemberByNickname, getSentLog, logSent } from "@/lib/google-sheets";
import { getFestivalsForTodaySend } from "@/lib/festival-config";
import { sendInviteLink, InviteType } from "@/lib/line-push";

function resolveInviteType(status: string): InviteType | null {
  if (status === "参加") return "participation";
  if (status === "保留（参加より）" || status === "保留（不参加より）") return "pending";
  return null;
}

export async function GET(req: NextRequest) {
  // Vercel Cronからの呼び出し検証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const festivals = await getFestivalsForTodaySend();
  if (festivals.length === 0) {
    return NextResponse.json({ message: "No festivals to process today" });
  }

  const results: { festivalId: string; sent: number; skipped: number; errors: string[] }[] = [];

  for (const festival of festivals) {
    const [records, sentLog] = await Promise.all([
      getAttendanceRecords(festival.spreadsheetId),
      getSentLog(festival.id),
    ]);

    const sentNicknames = new Set(sentLog.map((s) => s.nickname));
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const record of records) {
      const inviteType = resolveInviteType(record.status);
      if (!inviteType) { skipped++; continue; }
      if (sentNicknames.has(record.nickname)) { skipped++; continue; }

      const member = await findMemberByNickname(record.nickname);
      if (!member?.lineUserId) {
        errors.push(`LINE ID未登録: ${record.nickname}`);
        continue;
      }

      try {
        await sendInviteLink(
          member.lineUserId,
          inviteType,
          festival.participationGroupLink,
          festival.pendingGroupLink,
          festival.festivalName
        );
        await logSent({
          festivalId: festival.id,
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

    results.push({ festivalId: festival.id, sent, skipped, errors });
  }

  return NextResponse.json({ results });
}
