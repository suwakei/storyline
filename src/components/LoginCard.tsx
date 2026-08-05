"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { Banner, Button, Field, TextInput } from "@/components/ui";
import {
  signInWithGoogleAction,
  signInWithInviteCodeAction,
} from "@/lib/auth-actions";

/**
 * size="touch" を使わないのは、min-h-11 と min-h-12 が両方生成されて
 * どちらが勝つかが Tailwind のビルド順に依存するため (design ui-spec 2-2)。
 */
function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
      className="mt-4 min-h-12 w-full"
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function LoginCard({
  errorMessage,
  inviteFormOpen,
  callbackUrl,
}: {
  errorMessage: string | null;
  inviteFormOpen: boolean;
  callbackUrl: string;
}) {
  const [showInvite, setShowInvite] = useState(inviteFormOpen);

  return (
    <div className="bg-surface border-line w-full max-w-sm rounded-2xl border p-8 shadow-sm">
      <h1 className="text-center text-4xl font-bold tracking-tight">
        storyline
      </h1>
      <p className="text-muted mt-3 text-center text-sm leading-relaxed">
        シナリオの時系列とキャラクターのつながりを整理するツール
      </p>

      {errorMessage && (
        <div className="mt-6">
          <Banner tone="danger">{errorMessage}</Banner>
        </div>
      )}

      <form action={signInWithGoogleAction.bind(null, callbackUrl)}>
        <SubmitButton
          label="Google でログイン"
          pendingLabel="ログインしています…"
        />
      </form>

      <div className="border-line mt-6 border-t pt-4">
        <p className="text-muted text-center text-xs leading-relaxed">
          はじめての方は招待コードが必要です
        </p>

        {showInvite ? (
          // 招待コードはサーバ側でしか照合しない。値がこの画面へ降りてくることはない。
          <form action={signInWithInviteCodeAction.bind(null, callbackUrl)} className="mt-3">
            <Field label="招待コード">
              <TextInput
                name="inviteCode"
                required
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="受け取ったコード"
                className="min-h-11"
              />
            </Field>
            <SubmitButton
              label="招待コードでログイン"
              pendingLabel="確認しています…"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="text-accent hover:bg-surface2 mt-1 flex min-h-11 w-full items-center justify-center rounded-md text-xs transition-colors"
          >
            招待コードを入力する
          </button>
        )}
      </div>
    </div>
  );
}
