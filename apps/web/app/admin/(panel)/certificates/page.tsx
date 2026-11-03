import type { Metadata } from "next";
import { CertificateList } from "@/components/admin/pages/Certificates";

export const metadata: Metadata = { title: "Certificates" };

export default function Page() {
  return <CertificateList />;
}
