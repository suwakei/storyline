"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { IconButton } from "@/components/ui";
import { signOutAction } from "@/lib/auth-actions";

/**
 * メニュー行に `Button` を使わないのは、基底クラスの `justify-center` を
 * className の追記で確実に上書きできないため (design ui-spec 3-4)。
 */
function SignOutRow() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="hover:bg-surface2 min-h-11 w-full px-4 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:min-h-9"
    >
      {pending ? "ログアウトしています…" : "ログアウト"}
    </button>
  );
}

function MenuBody({ email }: { email: string }) {
  return (
    <>
      <div className="border-line border-b px-4 py-3">
        <p className="text-muted text-xs">ログイン中</p>
        <p className="truncate text-sm font-medium" title={email}>
          {email}
        </p>
      </div>
      {/* ログアウトは可逆な操作なので確認ダイアログを挟まない (design ui-spec 3-4) */}
      <form action={signOutAction} className="py-1">
        <SignOutRow />
      </form>
    </>
  );
}

/**
 * `/` ヘッダのアカウントメニュー。モバイルは下から出るシート、PC はポップオーバー。
 * 出し分けは CSS のみ (`md:hidden` / `hidden md:block`)。
 */
export function AccountMenu({
  email,
  imageUrl,
}: {
  email: string;
  imageUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Google のアバター URL はプロフィール写真の差し替えで失効する。落ちたら頭文字に戻す
  const [imageBroken, setImageBroken] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      {/*
        IconButton を流用しないのは基底クラスの rounded-md を確実に上書きできないため
        (design ui-spec 3-1)。
      */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="アカウントメニューを開く"
        onClick={() => setOpen((v) => !v)}
        className="bg-accent/15 text-accent flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold md:h-8 md:w-8"
      >
        {imageUrl && !imageBroken ? (
          // 外部ドメインの固定サイズ画像で最適化の余地が無いため next/image は使わない
          // (remotePatterns の許可も不要になる)
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={96}
            height={96}
            referrerPolicy="no-referrer"
            onError={() => setImageBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          (email.charAt(0).toUpperCase() || "?")
        )}
      </button>

      {open && (
        <>
          {/* モバイル (md 未満): 下から出るシート */}
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
            <div
              className="flex-1 bg-black/30"
              onMouseDown={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="アカウントメニュー"
              className="bg-surface border-line w-full rounded-t-2xl border-t shadow-2xl"
            >
              <div className="border-line flex items-center justify-between border-b px-4 py-2">
                <h2 className="text-sm font-semibold">アカウント</h2>
                <IconButton
                  label="閉じる"
                  size="touch"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </IconButton>
              </div>
              <MenuBody email={email} />
            </div>
          </div>

          {/* PC (md 以上): ヘッダ右のポップオーバー。暗転させず透明のクリックキャッチャーだけ置く */}
          <div className="hidden md:block">
            <div
              className="fixed inset-0 z-40"
              onMouseDown={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="アカウントメニュー"
              className="bg-surface border-line absolute top-full right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border shadow-xl"
            >
              <MenuBody email={email} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
