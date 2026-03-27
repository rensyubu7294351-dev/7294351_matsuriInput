const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

interface TextMessage {
  type: "text";
  text: string;
}

async function pushMessage(
  to: string,
  messages: TextMessage[]
): Promise<void> {
  const res = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LINE Push API error ${res.status}: ${body}`);
  }
}

export type InviteType = "participation" | "pending";

export async function sendInviteLink(
  lineUserId: string,
  inviteType: InviteType,
  participationLink: string,
  pendingLink: string,
  festivalName: string
): Promise<void> {
  const link =
    inviteType === "participation" ? participationLink : pendingLink;
  const groupName =
    inviteType === "participation" ? "参加グループ" : "保留グループ";

  const message =
    `【${festivalName}】\n` +
    `出欠のご回答ありがとうございます！\n\n` +
    `${groupName}への招待リンクはこちらです👇\n` +
    link;

  await pushMessage(lineUserId, [{ type: "text", text: message }]);
}

export async function sendMagicLink(
  lineUserId: string,
  magicLinkUrl: string
): Promise<void> {
  const message =
    `【管理画面ログイン】\n` +
    `以下のリンクから管理画面にアクセスできます。\n` +
    `有効期限: 1時間\n\n` +
    magicLinkUrl;

  await pushMessage(lineUserId, [{ type: "text", text: message }]);
}
