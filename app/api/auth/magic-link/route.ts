import { NextRequest, NextResponse } from "next/server";
import { generateMagicToken, isAdminLineUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { lineUserId } = await req.json();

  if (!lineUserId || typeof lineUserId !== "string") {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  if (!isAdminLineUserId(lineUserId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const token = generateMagicToken(lineUserId);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const magicUrl = `${baseUrl}/admin?token=${token}`;

  return NextResponse.json({ url: magicUrl });
}
