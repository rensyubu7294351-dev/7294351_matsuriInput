import { NextRequest, NextResponse } from "next/server";
import { registerMember, findMemberByLineUserId, updateMemberEmail } from "@/lib/google-sheets";

export async function POST(req: NextRequest) {
  const { lineUserId, email, nickname, fullName } = await req.json();

  if (!lineUserId || !email) {
    return NextResponse.json({ error: "lineUserId and email are required" }, { status: 400 });
  }

  const existing = await findMemberByLineUserId(lineUserId);
  if (existing) {
    if (existing.email) {
      // メールアドレス登録済み
      return NextResponse.json({ success: true, alreadyRegistered: true });
    }
    // 旧登録（メールなし）→ メールアドレスを追加
    await updateMemberEmail(lineUserId, email.trim());
    return NextResponse.json({ success: true });
  }

  await registerMember({ lineUserId, email: email.trim(), nickname: nickname ?? "", fullName: fullName ?? "" });
  return NextResponse.json({ success: true }, { status: 201 });
}
