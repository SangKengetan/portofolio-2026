import type { Experience } from "@portfolio/shared";
import { GhostHeading } from "@/components/ui/GhostHeading";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ExperienceCard } from "./ExperienceCard";
import { ExperienceScroller } from "./ExperienceScroller";

/** ③ Experience — dark section, horizontally scrolling cards. */
export function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  const header = (
    <div className="container-site relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <GhostHeading text="Experiences" className="top-1/2 -translate-y-1/2" />
      <div className="relative">
        <SectionLabel>Career archive</SectionLabel>
        <h2 id="experience-title" className="mt-2 text-h2 font-semibold tracking-[-0.03em] text-text uppercase">
          Experiences
        </h2>
      </div>
      <p className="relative text-small text-text-muted">Roles, systems, and the work behind them.</p>
    </div>
  );

  return (
    <section
      id="experience"
      data-theme="dark"
      aria-labelledby="experience-title"
      className="overflow-x-clip bg-bg py-[var(--section-y)] lg:py-0"
    >
      <ExperienceScroller header={header}>
        {experiences.map((exp, i) => (
          <li
            key={exp.id}
            className="w-full shrink-0 snap-start md:w-[min(86vw,860px)] lg:h-[min(560px,calc(100vh_-_var(--nav-h)_-_220px))] lg:w-[min(78vw,1000px)]"
          >
            <ExperienceCard experience={exp} index={i} className="h-full" />
          </li>
        ))}
      </ExperienceScroller>
    </section>
  );
}
