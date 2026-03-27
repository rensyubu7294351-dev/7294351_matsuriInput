import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.MAGIC_LINK_SECRET!;
const MAGIC_LINK_TTL_MS = 10 * 60 * 1000; // 10分
const SESSION_TTL_MS = 60 * 60 * 1000;    // 1時間

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function encodePayload(data: object): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

function decodePayload<T>(payload: string): T | null {
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

// ---- マジックリンクトークン（署名付き・有効期限10分） ----
// サーバーに保存しない。署名と有効期限で検証する。

export function generateMagicToken(lineUserId: string): string {
  const payload = encodePayload({ lineUserId, exp: Date.now() + MAGIC_LINK_TTL_MS });
  return `${payload}.${sign(payload)}`;
}

export function verifyMagicToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);

  const expectedSig = sign(payload);
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
  } catch {
    return null;
  }

  const data = decodePayload<{ lineUserId: string; exp: number }>(payload);
  if (!data || Date.now() > data.exp) return null;

  return data.lineUserId;
}

// ---- セッショントークン（署名付きCookie・有効期限1時間） ----
// サーバーに保存しない。Cookie自体に署名と有効期限を埋め込む。

export function generateSessionToken(lineUserId: string): string {
  const payload = encodePayload({ lineUserId, exp: Date.now() + SESSION_TTL_MS });
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const payload = token.substring(0, lastDot);
  const sig = token.substring(lastDot + 1);

  const expectedSig = sign(payload);
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return null;
  } catch {
    return null;
  }

  const data = decodePayload<{ lineUserId: string; exp: number }>(payload);
  if (!data || Date.now() > data.exp) return null;

  return data.lineUserId;
}

// ---- 管理者リスト ----
export function isAdminLineUserId(lineUserId: string): boolean {
  const admins = (process.env.ADMIN_LINE_USER_IDS ?? "").split(",").map((s) => s.trim());
  return admins.includes(lineUserId);
}
