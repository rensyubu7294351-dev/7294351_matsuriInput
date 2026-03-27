import { NextRequest, NextResponse } from "next/server";
import { verifyMagicToken, generateSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const lineUserId = verifyMagicToken(token);
  if (!lineUserId) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const sessionToken = generateSessionToken(lineUserId);

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1時間
    path: "/",
  });
  return res;
}
