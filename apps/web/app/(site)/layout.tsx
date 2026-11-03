import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getProfile } from "@/lib/api";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const profile = await getProfile();
  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[60] -translate-y-20 rounded-md bg-accent px-4 py-2 text-small text-accent-fg focus:translate-y-0"
      >
        Skip to content
      </a>
      <Navbar
        profile={{
          shortName: profile.shortName,
          location: profile.location,
          timezone: profile.timezone,
          socials: profile.socials,
          email: profile.email,
        }}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        <span id="top" />
        {children}
      </main>
      <Footer profile={profile} />
    </>
  );
}
