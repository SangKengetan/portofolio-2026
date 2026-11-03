import type { Metadata } from "next";
import { ProjectEditor } from "@/components/admin/projects/ProjectEditor";

export const metadata: Metadata = { title: "New project" };

export default function Page() {
  return <ProjectEditor />;
}
