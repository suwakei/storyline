"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeCallbackUrl, signIn, signOut } from "@/lib/auth";
import {
  createInviteToken,
  equalsConstantTime,
  INVITE_COOKIE_NAME,
  INVITE_TOKEN_TTL_SEC,
  registerInviteAttempt,
} from "@/lib/invite";

/**
 * Google の同意画面へ送る (既存ユーザの経路)。
 * 新規ユーザかどうかの判定と招待コードの検証は auth.ts の signIn コールバックが持つ。
 */
export async function signInWithGoogleAction(callbackUrl: string): Promise<void> {
  await signIn("google", { redirectTo: safeCallbackUrl(callbackUrl) });
}

/**
 * 招待コードを検証してから Google の同意画面へ送る (はじめての人の経路)。
 *
 * **コードはこの関数の中でしか読まない。** ブラウザへ返すのは
 * 検証済みを示す短命 httpOnly クッキーだけで、値にコードは入っていない。
 */
export async function signInWithInviteCodeAction(
  callbackUrl: string,
  formData: FormData,
): Promise<void> {
  const target = safeCallbackUrl(callbackUrl);
  const backTo = (error: string) =>
    `/login?error=${error}&callbackUrl=${encodeURIComponent(target)}`;

  const inviteCode = process.env.AUTH_INVITE_CODE;
  const secret = process.env.AUTH_SECRET;
  if (!inviteCode || !secret) redirect(backTo("InviteCodeUnset"));

  // 総当たりを鈍らせるだけの軽い制限 (プロセスのメモリのみ)
  const requestHeaders = await headers();
  const clientKey =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!registerInviteAttempt(clientKey)) redirect(backTo("TooManyAttempts"));

  const input = formData.get("inviteCode");
  if (typeof input !== "string" || !equalsConstantTime(input.trim(), inviteCode)) {
    redirect(backTo("InviteCodeInvalid"));
  }

  const store = await cookies();
  store.set(INVITE_COOKIE_NAME, createInviteToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: INVITE_TOKEN_TTL_SEC,
  });

  await signIn("google", { redirectTo: target });
}

/** ログアウト。可逆な操作なので確認ダイアログは挟まない (design ui-spec 3-4) */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
