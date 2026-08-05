import { ProjectList } from "@/components/ProjectList";
import { requireSession } from "@/lib/auth";

export default async function ProjectListPage() {
  // proxy.ts のリダイレクトは Cookie の有無しか見ない。認可の実体はここ。
  const session = await requireSession("/");
  return (
    <ProjectList
      userEmail={session.user?.email ?? ""}
      userImage={session.user?.image}
    />
  );
}
