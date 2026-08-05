/**
 * `/login?error=<code>` に載ってくるコードを日本語の文言に落とす。
 * **このマッピングはここ 1 か所だけに置く** (design ui-spec 2-3)。
 *
 * コードは 2 系統ある:
 * - Auth.js が付けるもの (`@auth/core` の `ErrorPageParam` / `SignInPageErrorParam`。
 *   AccessDenied / Configuration / OAuthSignin / OAuthCallbackError など)
 * - 招待コードの検証で storyline 側が付けるもの (`InviteCode*` / `TooManyAttempts`)
 *
 * 画面は「招待コードの入力欄を開くべきか」と「文言」だけ分かれば足りるので、
 * すべてのコードを列挙はしない。
 */

const MESSAGES: Record<string, string> = {
  // 新規ユーザなのに有効な招待コードの証跡が無い (= signIn コールバックが false を返した)
  AccessDenied:
    "このアカウントはまだ登録されていません。はじめての方は招待コードを入力してください。",
  InviteCodeInvalid: "招待コードが違います。",
  InviteCodeUnset: "いまは新規登録を受け付けていません。",
  TooManyAttempts:
    "招待コードの入力が多すぎます。しばらく待ってからもう一度お試しください。",
};

/**
 * `/login` で招待コードの入力欄を開いた状態にするコード。
 * `InviteCodeUnset` / `TooManyAttempts` は入れない — 今すぐ打ち直しても通らないので、
 * 入力欄を開くと無駄な再試行を誘うだけになる。
 */
const REOPEN_INVITE_FORM = new Set(["AccessDenied", "InviteCodeInvalid"]);

export function loginErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return MESSAGES[code] ?? "ログインに失敗しました。もう一度お試しください。";
}

export function shouldOpenInviteForm(code: string | null | undefined): boolean {
  return code ? REOPEN_INVITE_FORM.has(code) : false;
}
