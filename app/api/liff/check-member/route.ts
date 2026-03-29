import { NextRequest, NextResponse } from "next/server";
import { findMemberByLineUserId } from "@/lib/google-sheets";

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId");
  if (!lineUserId) {
    return NextResponse.json({ error: "lineUserId is required" }, { status: 400 });
  }

  const member = await findMemberByLineUserId(lineUserId);
  return NextResponse.json({ registered: !!(member?.email) });
}
