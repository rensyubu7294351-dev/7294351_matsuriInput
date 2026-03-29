import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { getFestivalConfigById } from "@/lib/festival-config";
import { getAttendanceRecords, getGroupJoinLog, findMemberByEmail } from "@/lib/google-sheets";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return verifySessionToken(session);
}

// GET /api/admin/group-status?festivalId=xxx&groupType=participation|pending
export async function GET(req: NextRequest) {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const festivalId = req.nextUrl.searchParams.get("festivalId");
  const groupType = req.nextUrl.searchParams.get("groupType");

  if (!festivalId || !groupType) {
    return NextResponse.json({ error: "festivalId and groupType are required" }, { status: 400 });
  }

  const config = await getFestivalConfigById(festivalId);
  if (!config) return NextResponse.json({ error: "Festival not found" }, { status: 404 });

  const groupId = groupType === "participation"
    ? config.participationGroupId
    : config.pendingGroupId;

  if (!groupId) {
    return NextResponse.json({ groupId: null, members: [] });
  }

  const [attendanceRecords, joinLog] = await Promise.all([
    getAttendanceRecords(config.spreadsheetId),
    getGroupJoinLog(groupId),
  ]);

  // Googleフォームの回答から対象者を絞り込む
  const targetRecords = attendanceRecords.filter((r) =>
    groupType === "participation"
      ? r.status === "参加"
      : r.status.startsWith("保留")
  );

  // 同じメールアドレスで複数回答がある場合は重複を除去（最新のみ）
  const seen = new Set<string>();
  const uniqueRecords = targetRecords.filter((r) => {
    const email = r.email.trim().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  // グループ参加ログからジョイン済みLINEユーザーIDのセットを作る
  const joinedUserIds = new Set(joinLog.map((j) => j.lineUserId));

  const members = await Promise.all(
    uniqueRecords.map(async (r) => {
      const member = await findMemberByEmail(r.email);
      const uid = member?.lineUserId ?? "";
      return {
        nickname: r.nickname || r.email,
        lineUserId: uid,
        joined: uid ? joinedUserIds.has(uid) : false,
      };
    })
  );

  return NextResponse.json({ groupId, members });
}
