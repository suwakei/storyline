import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * 招待コードの検証と、「検証済み」の証跡トークン。
 *
 * **`AUTH_INVITE_CODE` の値をクライアントへ出さない**ことがこのモジュールの目的。
 * 比較も証跡の発行もサーバ側だけで行い、ブラウザへ渡すのは
 * 「いつまで有効か」＋ その HMAC 署名だけ（コードそのものは入れない）。
 *
 * `node:crypto` を使うのでクライアントコンポーネントから import しないこと。
 */

/** 証跡クッキーの名前。Auth.js の `authjs.*` と衝突させない */
export const INVITE_COOKIE_NAME = "storyline.invite";

/** 証跡の寿命。コード入力 → Google の同意画面 → コールバックが通れば十分な長さ */
export const INVITE_TOKEN_TTL_SEC = 10 * 60;

/**
 * 長さが違っても例外にならず、内容の差も時間差に出さない比較。
 * `timingSafeEqual` は長さ違いで throw するので、両方を固定長ハッシュに畳んでから比べる。
 */
export function equalsConstantTime(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** 「招待コードを検証した」証跡。`<有効期限ms>.<署名>` の形で、コードは含まない */
export function createInviteToken(secret: string, now = Date.now()): string {
  const expiresAt = String(now + INVITE_TOKEN_TTL_SEC * 1000);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifyInviteToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const separator = token.indexOf(".");
  if (separator <= 0) return false;

  const expiresAt = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!equalsConstantTime(signature, sign(expiresAt, secret))) return false;

  const expiresAtMs = Number(expiresAt);
  return Number.isFinite(expiresAtMs) && expiresAtMs > now;
}

/**
 * 総当たりを鈍らせるだけの軽いレート制限。
 * **プロセスのメモリにしか持たない**ので、再デプロイやサーバレスのコールドスタートで
 * リセットされるし、インスタンスをまたいだ合算もできない。厳密な防御ではない。
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

/** 1 回ぶん記録する。上限を超えていたら `false` */
export function registerInviteAttempt(key: string, now = Date.now()): boolean {
  for (const [k, v] of attempts) if (v.resetAt <= now) attempts.delete(k);

  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_ATTEMPTS;
}
