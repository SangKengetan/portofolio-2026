import type { Metadata } from "next";
import { ExperienceEditor } from "@/components/admin/pages/Experiences";

export const metadata: Metadata = { title: "New experience" };

export default function Page() {
  return <ExperienceEditor />;
}
