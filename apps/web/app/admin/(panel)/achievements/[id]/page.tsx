import type { Metadata } from "next";
import { AchievementEditor } from "@/components/admin/pages/Achievements";

export const metadata: Metadata = { title: "Edit achievement" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AchievementEditor id={id} />;
}
