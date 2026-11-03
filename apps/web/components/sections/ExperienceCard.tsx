import type { Experience } from "@portfolio/shared";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn, employmentLabels, formatPeriod, pad2 } from "@/lib/utils";

interface ExperienceCardProps {
  experience: Experience;
  index: number;
  className?: string;
}

/**
 * Light card on the dark Experience section: text left, monochrome photo right.
 * Stacks vertically below 768px (photo on top).
 */
export function ExperienceCard({ experience: exp, index, className }: ExperienceCardProps) {
  return (
    <article
      data-theme="light"
      className={cn(
        "group grid overflow-hidden rounded-lg bg-surface md:grid-cols-[1.35fr_1fr]",
        className,
      )}
    >
      <div className="order-2 flex flex-col p-6 md:order-1 md:p-8 xl:p-10">
        <p className="text-label text-text-subtle">
          Professional experience · {employmentLabels[exp.employmentType]}
        </p>
        <h3 className="mt-4 text-[clamp(28px,22px+1.8vw,48px)] leading-[0.95] font-semibold tracking-[-0.035em] text-text uppercase">
          {exp.role}
        </h3>
        <p className="mt-3 text-label text-text">
          {exp.companyUrl ? (
            <a href={exp.companyUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
              {exp.company}
            </a>
          ) : (
            exp.company
          )}
          {exp.location && <span className="text-text-subtle"> · {exp.location}</span>}
        </p>
        <p className="mt-6 text-small text-text-muted md:text-body md:leading-relaxed">{exp.description}</p>

        {exp.highlights.length > 0 && (
          <div className="mt-auto pt-8">
            <p className="text-label text-text-subtle">Highlights</p>
            <ol className="mt-3 grid gap-x-6 sm:grid-cols-2">
              {exp.highlights.map((h, i) => (
                <li key={h} className="flex gap-3 border-t border-border py-3 text-[13px] font-medium tracking-[0.02em] text-text uppercase">
                  <span className="font-mono text-text-subtle">{pad2(i + 1)}</span>
                  {h}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="relative order-1 aspect-[16/10] overflow-hidden bg-surface-2 md:order-2 md:aspect-auto md:min-h-full">
        {exp.image && (
          <SmartImage
            src={exp.image.url}
            alt={exp.image.alt}
            fill
            sizes="(min-width: 1024px) 420px, (min-width: 768px) 40vw, 100vw"
            className="photo-mono object-cover"
          />
        )}
        <span className="absolute top-4 right-5 font-mono text-2xl font-medium text-[#faf9f6] mix-blend-difference">
          {pad2(index + 1)}
        </span>
        <span className="absolute bottom-4 left-5 rounded-sm bg-[rgba(26,26,24,0.55)] px-2 py-1 font-mono text-[11px] tracking-[0.08em] text-[#edece8] uppercase backdrop-blur-sm">
          {formatPeriod(exp.startDate, exp.endDate)}
        </span>
      </div>
    </article>
  );
}
