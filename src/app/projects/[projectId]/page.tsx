import { ProjectWorkspace } from "@/components/ProjectWorkspace";
import { requireSession } from "@/lib/auth";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  // proxy.ts のリダイレクトは Cookie の有無しか見ない。認可の実体はここ。
  await requireSession(`/projects/${projectId}`);
  return <ProjectWorkspace projectId={projectId} />;
}
