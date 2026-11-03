import Link from "next/link";
import type { Profile } from "@portfolio/shared";
import { LocalTime } from "@/components/ui/LocalTime";
import { SocialLinks } from "@/components/ui/SocialLinks";

/** ⑧ Footer — © name · location · local time · socials (dark). */
export function Footer({ profile }: { profile: Profile }) {
  const year = new Date().getFullYear();
  return (
    <footer data-theme="dark" className="bg-bg">
      <div className="container-site">
        <div className="flex flex-col gap-6 border-t border-border py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-small text-text-muted">
            © {year} <span className="text-text">{profile.fullName}</span>
          </p>
          <p className="flex items-center gap-3 text-label text-text-muted">
            <span>{profile.location}</span>
            <span aria-hidden="true">·</span>
            <LocalTime timezone={profile.timezone} />
          </p>
          <div className="flex items-center gap-4">
            <SocialLinks socials={profile.socials} email={profile.email} />
            <Link href="#top" className="text-label text-text-muted transition-colors hover:text-text">
              Back to top ↑
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
