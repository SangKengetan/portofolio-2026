import type { Metadata } from "next";
import { CertificateEditor } from "@/components/admin/pages/Certificates";

export const metadata: Metadata = { title: "Edit certificate" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CertificateEditor id={id} />;
}
