import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { getFestivalConfigById } from "@/lib/festival-config";
import { getMembers, getSentLog } from "@/lib/google-sheets";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return verifySessionToken(session);
}

async function getAllGroupMemberIds(groupId: string): Promise<string[]> {
  const ids: string[] = [];
  let start: string | undefined;

  do {
    const url = new URL(`https://api.line.me/v2/bot/group/${groupId}/members/ids`);
    if (start) url.searchParams.set("start", start);

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.LINE_MONITOR_CHANNEL_ACCESS_TOKEN}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LINE API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    ids.push(...(data.memberIds ?? []));
    start = data.next;
  } while (start);

  return ids;
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

  const [memberIds, allMembers, sentLog] = await Promise.all([
    getAllGroupMemberIds(groupId),
    getMembers(),
    getSentLog(config.spreadsheetId),
  ]);

  // 招待リンクを送った人だけに絞り込む
  const linkType = groupType === "participation" ? "participation" : "pending";
  const invitedNicknames = new Set(
    sentLog.filter((s) => s.linkType === linkType).map((s) => s.nickname)
  );

  const memberIdSet = new Set(memberIds);
  const memberMap = new Map(allMembers.map((m) => [m.nickname, m.lineUserId]));

  const members = [...invitedNicknames].map((nickname) => {
    const lineUserId = memberMap.get(nickname) ?? "";
    return {
      nickname,
      lineUserId,
      joined: lineUserId ? memberIdSet.has(lineUserId) : false,
    };
  });

  return NextResponse.json({ groupId, members });
}
