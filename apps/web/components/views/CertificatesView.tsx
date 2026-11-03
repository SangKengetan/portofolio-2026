import type { Achievement, Certificate } from "@portfolio/shared";
import { GhostHeading } from "@/components/ui/GhostHeading";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AchievementTimeline } from "@/components/certificate/AchievementTimeline";
import { CertificatesBrowser } from "@/components/certificate/CertificatesBrowser";

/** /certificates — certificates grid + achievements timeline (section 5.4). */
export function CertificatesView({ certificates, achievements }: { certificates: Certificate[]; achievements: Achievement[] }) {
  return (
    <div data-theme="light" className="bg-bg">
      <header className="relative overflow-x-clip pt-[calc(var(--nav-h)_+_48px)] pb-10 md:pt-[calc(var(--nav-h)_+_80px)]">
        <div className="container-site relative">
          <GhostHeading text="Credentials" align="right" className="top-1/2 -translate-y-1/2" />
          <h1 className="relative max-w-[14ch] text-display-xl text-text">
            Certificates &amp; achievements<span className="font-serif font-normal italic">.</span>
          </h1>
        </div>
      </header>

      <section aria-labelledby="certs-title" className="container-site pb-[var(--section-y)]">
        <h2 id="certs-title" className="sr-only">
          Certificates
        </h2>
        <CertificatesBrowser certificates={certificates} />
      </section>

      <section aria-labelledby="achievements-title" className="container-site pb-[var(--section-y)]">
        <div className="grid gap-10 border-t border-border pt-12 lg:grid-cols-[300px_1fr] lg:gap-16">
          <div>
            <SectionLabel>Recognition</SectionLabel>
            <h2 id="achievements-title" className="mt-2 text-h2 text-text">
              Achievements
            </h2>
          </div>
          <Reveal>
            <AchievementTimeline achievements={achievements} />
          </Reveal>
        </div>
      </section>
    </div>
  );
}
