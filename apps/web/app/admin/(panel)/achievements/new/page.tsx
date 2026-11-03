import type { Metadata } from "next";
import { AchievementEditor } from "@/components/admin/pages/Achievements";

export const metadata: Metadata = { title: "New achievement" };

export default function Page() {
  return <AchievementEditor />;
}
