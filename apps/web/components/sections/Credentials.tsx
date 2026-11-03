import type { Achievement, Certificate } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AchievementTimeline } from "@/components/certificate/AchievementTimeline";
import { CertificateGrid } from "@/components/certificate/CertificateGrid";

/** ⑥ Certificates & achievements — featured certificates left, achievement timeline right. */
export function Credentials({ certificates, achievements }: { certificates: Certificate[]; achievements: Achievement[] }) {
  return (
    <section id="certificates" data-theme="light" aria-labelledby="credentials-title" className="bg-bg pb-[var(--section-y)]">
      <div className="container-site">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Credentials</SectionLabel>
            <h2 id="credentials-title" className="mt-2 text-h2 font-semibold tracking-[-0.03em] uppercase">
              Certificates &amp; achievements
            </h2>
          </div>
          <Button href="/certificates" variant="ghost" size="sm" icon="arrow-right">
            View all
          </Button>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
          <Reveal>
            <h3 className="sr-only">Featured certificates</h3>
            <CertificateGrid certificates={certificates.slice(0, 4)} variant="compact" className="sm:grid-cols-2" />
          </Reveal>
          <Reveal delay={100}>
            <div className="lg:border-l lg:border-border lg:pl-10">
              <h3 className="mb-6 text-label text-text-subtle">Achievements</h3>
              <AchievementTimeline achievements={achievements.slice(0, 3)} variant="compact" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
