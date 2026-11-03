import type { Metadata } from "next";
import { SkillsManager } from "@/components/admin/pages/Skills";

export const metadata: Metadata = { title: "Skills" };

export default function Page() {
  return <SkillsManager />;
}
