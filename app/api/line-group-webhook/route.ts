import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { logGroupJoin } from "@/lib/google-sheets";

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

async function sendMessageToGroup(groupId: string, message: string): Promise<void> {
  await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_MONITOR_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: groupId,
      messages: [{ type: "text", text: message }],
    }),
  });
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

      // グループ名を取得
      let groupName = "（グループ名取得失敗）";
      try {
        const summaryRes = await fetch(
          `https://api.line.me/v2/bot/group/${groupId}/summary`,
          { headers: { Authorization: `Bearer ${process.env.LINE_MONITOR_CHANNEL_ACCESS_TOKEN}` } }
        );
        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          groupName = summary.groupName ?? groupName;
        }
      } catch { /* グループ名取得失敗時はデフォルト値を使用 */ }

      // グループ内に自分のグループIDを投稿（どのグループかすぐわかる）
      await sendMessageToGroup(
        groupId,
        `━━━━━━━━━━━━━━━\nグループ名：${groupName}\n【このグループのID】\n${groupId}\n━━━━━━━━━━━━━━━\n管理画面で祭り設定を編集して、上のIDを「参加グループID」または「保留グループID」に貼り付けてください。`
      );

      // 管理者のLINEにも通知
      await sendPushToAdmin(
        `━━━━━━━━━━━━━━━\n【グループ参加通知】\nグループ名：${groupName}\n\nグループID:\n${groupId}\n━━━━━━━━━━━━━━━\n管理画面で上のIDを「参加グループID」または「保留グループID」の適切な方に入力してください。`
      );
    }

    // メンバーがグループに参加したとき
    if (event.type === "memberJoined" && event.source?.type === "group") {
      const groupId = event.source.groupId as string;
      for (const member of event.joined?.members ?? []) {
        if (member.type === "user") {
          await logGroupJoin(groupId, member.userId);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
