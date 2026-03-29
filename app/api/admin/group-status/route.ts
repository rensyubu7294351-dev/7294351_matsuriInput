import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { getFestivalConfigById } from "@/lib/festival-config";
import { getMembers, getSentLog, getGroupJoinLog } from "@/lib/google-sheets";

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

  const linkType = groupType === "participation" ? "participation" : "pending";

  const [allMembers, sentLog, joinLog] = await Promise.all([
    getMembers(),
    getSentLog(config.spreadsheetId),
    getGroupJoinLog(groupId),
  ]);

  // 招待リンクを送った人だけに絞り込む
  const invitedNicknames = new Set(
    sentLog.filter((s) => s.linkType === linkType).map((s) => s.nickname)
  );

  // グループ参加ログからジョイン済みLINEユーザーIDのセットを作る
  const joinedUserIds = new Set(joinLog.map((j) => j.lineUserId));
  const memberMap = new Map(allMembers.map((m) => [m.nickname, m.lineUserId]));

  const members = [...invitedNicknames].map((nickname) => {
    const uid = memberMap.get(nickname) ?? "";
    return {
      nickname,
      lineUserId: uid,
      joined: uid ? joinedUserIds.has(uid) : false,
    };
  });

  return NextResponse.json({ groupId, members });
}
