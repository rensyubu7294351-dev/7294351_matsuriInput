import { NextRequest, NextResponse } from "next/server";
import { registerMember, findMemberByLineUserId } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  const { lineUserId, nickname, fullName } = await req.json();

  if (!lineUserId || !nickname) {
    return NextResponse.json({ error: "lineUserId and nickname are required" }, { status: 400 });
  }

  // 既に登録済みの場合はスキップ
  const existing = await findMemberByLineUserId(lineUserId);
  if (existing) {
    return NextResponse.json({ success: true, alreadyRegistered: true });
  }

  await registerMember({ lineUserId, nickname, fullName: fullName ?? "" });
  return NextResponse.json({ success: true }, { status: 201 });
}
