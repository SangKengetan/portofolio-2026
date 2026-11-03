import type { Metadata } from "next";
import { CertificateEditor } from "@/components/admin/pages/Certificates";

export const metadata: Metadata = { title: "New certificate" };

export default function Page() {
  return <CertificateEditor />;
}
