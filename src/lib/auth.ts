import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { INVITE_COOKIE_NAME, verifyInviteToken } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

/** spec 4-2: 書きたくなったら開いて数分触る使い方なので、毎回同意画面を挟まない */
const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
/** アクセスのたびに延長する (rolling)。1 日以上経ったセッションを書き戻す */
const SESSION_UPDATE_AGE_SEC = 24 * 60 * 60;

/**
 * 「直前に招待コードを検証した」証跡が今も有効か。
 * `AUTH_INVITE_CODE` が未設定なら**常に false** = 新規ユーザを作らない (フェイルセーフ)。
 */
async function hasVerifiedInvite(): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!process.env.AUTH_INVITE_CODE || !secret) return false;

  const store = await cookies();
  if (!verifyInviteToken(store.get(INVITE_COOKIE_NAME)?.value, secret)) {
    return false;
  }

  // 1 回使ったら捨てる (best effort)。Route Handler の外で呼ばれても落とさない。
  try {
    store.delete(INVITE_COOKIE_NAME);
  } catch {
    // 消せなくても証跡は 10 分で失効する
  }
  return true;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: {
    strategy: "database",
    maxAge: SESSION_MAX_AGE_SEC,
    updateAge: SESSION_UPDATE_AGE_SEC,
  },
  // Auth.js 既定のエラーページは英語なので使わない。両方 /login に寄せて日本語で出す
  // (kind が "signIn" のエラーは signIn へ、それ以外は error へ振られる)。
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ profile }) {
      const email = profile?.email;
      // Google 側で検証済みのアドレスであることを条件にする
      if (!email || profile?.email_verified !== true) return false;

      // 既存ユーザは招待コード不要。この callback は handleLoginOrRegister より前に
      // 走るので、ここで User 行が無い = これから作られる新規ユーザ。
      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) return true;

      // 新規ユーザは招待コードを検証した証跡があるときだけ通す。
      // false を返すと Auth.js が AccessDenied を投げ、/login?error=AccessDenied へ戻る。
      return hasVerifiedInvite();
    },
  },
  events: {
    // User.image はアダプタが createUser のときしか書かない。Google 側でプロフィール写真を
    // 差し替えると保存済み URL が 404 になるため、ログインのたびに追従させる。
    async signIn({ user, profile }) {
      const picture =
        typeof profile?.picture === "string" ? profile.picture : null;
      if (!user.id || !picture || picture === user.image) return;

      // 表示のためだけの値なので、書けなくてもログインは通す (次のログインで再試行される)
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { image: picture },
        });
      } catch {
        // noop
      }
    },
  },
});

/** 内部リンクだけを通す。外部 URL を callbackUrl に載せられないようにする */
export function safeCallbackUrl(value: string | undefined | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * ページ / Server Function の入口で必ず呼ぶ。
 * proxy.ts のリダイレクトは Cookie の有無しか見ない楽観的チェックなので、
 * 実際の認可判定はここ (= データに近い側) が持つ。
 */
export async function requireSession(callbackUrl: string) {
  const session = await auth();
  if (!session?.user) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(safeCallbackUrl(callbackUrl))}`,
    );
  }
  return session;
}
