import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false;
  const hash = createHmac("sha256", process.env.LINE_MONITOR_CHANNEL_SECRET!)
    .update(body)
    .digest("base64");
  return hash === signature;
}

async function sendPushToAdmin(message: string): Promise<void> {
  const adminIds = (process.env.ADMIN_LINE_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const userId of adminIds) {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_MONITOR_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }],
      }),
    });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  for (const event of payload.events ?? []) {
    // 監視ボットがグループに追加されたとき
    if (event.type === "join" && event.source?.type === "group") {
      const groupId = event.source.groupId as string;
      await sendPushToAdmin(
        `【グループ参加通知】\n監視ボットが新しいLINEグループに追加されました。\n\nグループID:\n${groupId}\n\n管理画面で該当の祭り設定を「編集」して、このグループIDを「参加グループID」または「保留グループID」の欄に入力してください。`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
