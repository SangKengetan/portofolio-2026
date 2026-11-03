import type { Metadata } from "next";
import { ExperienceEditor } from "@/components/admin/pages/Experiences";

export const metadata: Metadata = { title: "Edit experience" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExperienceEditor id={id} />;
}
