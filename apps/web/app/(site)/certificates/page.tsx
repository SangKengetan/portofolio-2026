import type { Metadata } from "next";
import { CertificatesView } from "@/components/views/CertificatesView";
import { getAchievements, getCertificates } from "@/lib/api";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Certificates & achievements",
  description: "Certificates, courses and competition results.",
  alternates: { canonical: "/certificates" },
};

export default async function CertificatesPage() {
  const [certificates, achievements] = await Promise.all([getCertificates(), getAchievements()]);
  return <CertificatesView certificates={certificates} achievements={achievements} />;
}
