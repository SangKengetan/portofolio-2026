import type { Metadata } from "next";
import { MessagesPage } from "@/components/admin/pages/Messages";

export const metadata: Metadata = { title: "Messages" };

export default function Page() {
  return <MessagesPage />;
}
