import type { GithubContributions as Data } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { GhostHeading } from "@/components/ui/GhostHeading";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";

const levelClass = [
  "bg-surface-2",
  "bg-[color-mix(in_srgb,var(--success)_28%,var(--surface-2))]",
  "bg-[color-mix(in_srgb,var(--success)_50%,var(--surface-2))]",
  "bg-[color-mix(in_srgb,var(--success)_75%,var(--surface-2))]",
  "bg-success",
];

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** GitHub contributions heatmap (optional feature from reference 1). */
export function GithubContributions({ data }: { data: Data }) {
  // Month label above the first week that starts in a new month
  const monthLabels = data.weeks.map((week, i) => {
    const first = week[0];
    if (!first) return null;
    const month = new Date(first.date).getUTCMonth();
    const prev = data.weeks[i - 1]?.[0];
    return !prev || new Date(prev.date).getUTCMonth() !== month ? monthFmt.format(new Date(first.date)) : null;
  });

  const stats = [
    { value: data.longestStreak, suffix: " days", label: "Longest streak" },
    { value: data.activeDaysPercent, suffix: "%", label: "Active days" },
  ];

  return (
    <section data-theme="light" aria-labelledby="github-title" className="relative overflow-x-clip bg-bg pb-[var(--section-y)]">
      <div className="container-site relative">
        <GhostHeading text="Contributions" className="top-0 -translate-y-1/4" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Open source & practice</SectionLabel>
            <h2 id="github-title" className="mt-2 text-h2 font-semibold tracking-[-0.03em] uppercase">
              GitHub contributions
            </h2>
          </div>
          <Button href={data.profileUrl} external variant="ghost" size="sm" icon="arrow-up-right">
            @{data.username}
          </Button>
        </div>

        <Reveal>
          <div className="relative mt-10 grid gap-8 rounded-xl border border-border bg-surface p-5 md:p-8 lg:grid-cols-[220px_1fr] lg:gap-10">
            <div className="flex flex-row flex-wrap gap-x-10 gap-y-6 lg:flex-col">
              <div>
                <p className="text-label text-text-subtle">Last 12 months</p>
                <p className="mt-1 font-serif text-[56px] leading-none text-text">{data.totalLastYear.toLocaleString("en-US")}</p>
                <p className="mt-1 text-small text-text-muted">contributions</p>
              </div>
              <dl className="flex gap-8">
                {stats.map((s) => (
                  <div key={s.label}>
                    <dt className="text-label text-text-subtle">{s.label}</dt>
                    <dd className="mt-1 text-h3 text-text">
                      {s.value}
                      {s.suffix}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="min-w-0">
              {/* Scrollable on small screens; starts scrolled to the most recent weeks via flex-row-reverse trick */}
              <div className="no-scrollbar flex flex-row-reverse overflow-x-auto" tabIndex={0} role="region" aria-label="Contribution calendar">
                <div className="w-max">
                  <div className="mb-2 grid grid-flow-col gap-[3px] text-[10px] text-text-subtle" style={{ gridTemplateColumns: `repeat(${data.weeks.length}, 11px)` }} aria-hidden="true">
                    {monthLabels.map((m, i) => (
                      <span key={i} className="overflow-visible whitespace-nowrap">
                        {m}
                      </span>
                    ))}
                  </div>
                  <p className="sr-only">
                    {data.totalLastYear} contributions in the last year. Hover a square to see the count for that day.
                  </p>
                  <table className="-m-[3px] border-separate border-spacing-[3px]" aria-hidden="true">
                    <tbody>
                      {Array.from({ length: 7 }, (_, day) => (
                        <tr key={day}>
                          {data.weeks.map((week, w) => {
                            const cell = week[day];
                            if (!cell) return <td key={w} className="size-[11px]" />;
                            return (
                              <td
                                key={w}
                                title={`${cell.count} contribution${cell.count === 1 ? "" : "s"} on ${dayFmt.format(new Date(cell.date))}`}
                                className={cn("size-[11px] rounded-[3px] p-0", levelClass[cell.level])}
                              />
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end gap-1.5 text-[11px] text-text-subtle" aria-hidden="true">
                Less
                {levelClass.map((c, i) => (
                  <span key={i} className={cn("size-[11px] rounded-[3px]", c)} />
                ))}
                More
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
