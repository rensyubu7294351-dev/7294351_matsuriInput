import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { getMembers, registerMember } from "@/lib/google-sheets";

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session")?.value;
  if (!session) return null;
  return verifySessionToken(session);
}

export async function GET() {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const members = await getMembers();
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const lineUserId = await requireAdmin();
  if (!lineUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.nickname || !body.lineUserId) {
    return NextResponse.json({ error: "nickname and lineUserId are required" }, { status: 400 });
  }

  await registerMember({
    nickname: body.nickname,
    fullName: body.fullName ?? "",
    lineUserId: body.lineUserId,
  });
  return NextResponse.json({ success: true }, { status: 201 });
}
