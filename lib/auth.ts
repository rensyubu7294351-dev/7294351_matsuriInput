import { randomBytes, createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.MAGIC_LINK_SECRET!;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1時間

// インメモリストア（Vercelはサーバーレスなので同一インスタンス内のみ有効）
// 本番では Vercel KV や Redis に置き換えることを推奨
const tokenStore = new Map<string, { lineUserId: string; expiresAt: number }>();

function sign(token: string): string {
  return createHmac("sha256", SECRET).update(token).digest("hex");
}

export function generateMagicToken(lineUserId: string): string {
  const rawToken = randomBytes(32).toString("hex");
  const signature = sign(rawToken);
  const fullToken = `${rawToken}.${signature}`;
  tokenStore.set(rawToken, {
    lineUserId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return fullToken;
}

export function verifyMagicToken(fullToken: string): string | null {
  const [rawToken, signature] = fullToken.split(".");
  if (!rawToken || !signature) return null;

  // 署名検証
  const expectedSig = sign(rawToken);
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }

  const entry = tokenStore.get(rawToken);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(rawToken);
    return null;
  }

  // ワンタイム：使用後に削除
  tokenStore.delete(rawToken);
  return entry.lineUserId;
}

// ---- 管理者リスト ----
// 環境変数 ADMIN_LINE_USER_IDS にカンマ区切りでLINE user IDを登録
export function isAdminLineUserId(lineUserId: string): boolean {
  const admins = (process.env.ADMIN_LINE_USER_IDS ?? "").split(",").map((s) =>
    s.trim()
  );
  return admins.includes(lineUserId);
}

// ---- セッション（簡易） ----
// magic linkでの認証後、セッションクッキーとしてトークンをセット
// Next.jsのcookiesを使う想定でここでは値の生成のみ

export function generateSessionToken(lineUserId: string): string {
  const rawToken = randomBytes(32).toString("hex");
  tokenStore.set(`session:${rawToken}`, {
    lineUserId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return rawToken;
}

export function verifySessionToken(token: string): string | null {
  const entry = tokenStore.get(`session:${token}`);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(`session:${token}`);
    return null;
  }
  return entry.lineUserId;
}
