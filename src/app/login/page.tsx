import { redirect } from "next/navigation";

import { LoginCard } from "@/components/LoginCard";
import { auth, safeCallbackUrl } from "@/lib/auth";
import { loginErrorMessage, shouldOpenInviteForm } from "@/lib/auth-errors";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(first(params.callbackUrl));
  const error = first(params.error);

  // ログイン済みなら玄関は見せない。proxy.ts ではなくここで判定するのは、
  // Cookie だけが残っている状態で /login ↔ / のループを起こさないため。
  const session = await auth();
  if (session?.user) redirect(callbackUrl);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <LoginCard
        errorMessage={loginErrorMessage(error)}
        inviteFormOpen={shouldOpenInviteForm(error)}
        callbackUrl={callbackUrl}
      />
    </main>
  );
}
