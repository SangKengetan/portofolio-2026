import type { Metadata } from "next";
import { ProfileForm } from "@/components/admin/pages/ProfileForm";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <ProfileForm />;
}
