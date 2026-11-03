import type { Achievement, AchievementLevel } from "@portfolio/shared";
import { Icon } from "@/components/ui/Icon";
import { cn, yearOf } from "@/lib/utils";

const levelLabels: Record<AchievementLevel, string> = {
  international: "International",
  national: "National",
  regional: "Regional",
  university: "University",
  other: "",
};

interface AchievementTimelineProps {
  achievements: Achievement[];
  /** "compact" = home page side column */
  variant?: "full" | "compact";
  className?: string;
}

export function AchievementTimeline({ achievements, variant = "full", className }: AchievementTimelineProps) {
  return (
    <ol className={cn("relative", className)}>
      {achievements.map((a, i) => (
        <li key={a.id} className="relative flex gap-4 pb-7 last:pb-0">
          {/* line + dot */}
          <span aria-hidden="true" className="relative flex w-8 shrink-0 justify-center">
            <span className="relative z-10 grid size-8 place-items-center rounded-full border border-border bg-surface text-text">
              <Icon name="trophy" size={15} />
            </span>
            {i < achievements.length - 1 && <span className="absolute top-8 bottom-[-4px] w-px bg-border" />}
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-label text-text-subtle">
              <time dateTime={a.achievedAt}>{yearOf(a.achievedAt)}</time>
              {levelLabels[a.level] && <> · {levelLabels[a.level]}</>}
            </p>
            <h3 className={cn("mt-1 font-semibold text-text", variant === "full" ? "text-h3" : "text-[15px] leading-snug")}>
              {a.linkUrl ? (
                <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                  {a.title}
                </a>
              ) : (
                a.title
              )}
            </h3>
            {a.organizer && <p className="mt-0.5 text-small text-text-muted">{a.organizer}</p>}
            {variant === "full" && a.description && <p className="mt-2 max-w-[60ch] text-small text-text-muted">{a.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
