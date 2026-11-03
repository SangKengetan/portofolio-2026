import type { Metadata } from "next";
import { ExperienceList } from "@/components/admin/pages/Experiences";

export const metadata: Metadata = { title: "Experience" };

export default function Page() {
  return <ExperienceList />;
}
