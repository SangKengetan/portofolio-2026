import type { Metadata } from "next";
import { AchievementList } from "@/components/admin/pages/Achievements";

export const metadata: Metadata = { title: "Achievements" };

export default function Page() {
  return <AchievementList />;
}
