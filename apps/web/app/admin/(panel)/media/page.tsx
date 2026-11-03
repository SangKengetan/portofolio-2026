import type { Metadata } from "next";
import { MediaPage } from "@/components/admin/pages/MediaPage";

export const metadata: Metadata = { title: "Media" };

export default function Page() {
  return <MediaPage />;
}
