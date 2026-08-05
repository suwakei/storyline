import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 で middleware は proxy にリネームされた。
 *
 * **ここは楽観的リダイレクトだけを行う。** 公式ドキュメントが
 * 「Proxy を完全な認証・認可の解決策として使うな」「Server Function は Proxy だけでは守れない」
 * と明記しているため、実際の認可判定は各ページ / Server Function 内の `auth()`
 * (`src/lib/auth.ts` の `requireSession`) が持つ。
 * ここでは DB を引かず、セッション Cookie の有無しか見ない。
 */

// @auth/core の defaultCookies() が付ける名前。https 環境では __Secure- が付く。
const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/** ログイン前でも到達できる必要があるパス */
const PUBLIC_PATHS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // /login でログイン済みだったときの「/ へ戻す」判定はここではやらない。
  // Cookie が残っているだけで実体が無い場合に /login ↔ / のリダイレクトループになるため、
  // その判定は実体を検証できる /login ページ側 (auth()) に置く。
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  url.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // /api/auth/* (Auth.js のハンドラ)・Next の内部アセット・拡張子付きの静的ファイルは通す
    "/((?!api/auth|_next/static|_next/image|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|txt|xml|webmanifest)$).*)",
  ],
};
