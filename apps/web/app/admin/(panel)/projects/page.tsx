import type { Metadata } from "next";
import { ProjectList } from "@/components/admin/projects/ProjectList";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return <ProjectList />;
}
