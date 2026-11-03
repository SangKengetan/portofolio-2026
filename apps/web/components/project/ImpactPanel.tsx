import type { ProjectMetric } from "@portfolio/shared";
import { cn } from "@/lib/utils";

/** Dark panel with the impact sentence and big numbers (section 5.3). */
export function ImpactPanel({ statement, metrics, className }: { statement: string | null; metrics: ProjectMetric[]; className?: string }) {
  return (
    <div data-theme="dark" className={cn("flex flex-col gap-10 rounded-xl bg-bg p-7 md:p-10", className)}>
      <p className="text-label text-text-subtle">Impact</p>
      {statement && <p className="-mt-6 text-body-lg text-text">{statement}</p>}
      {metrics.length > 0 && (
        <dl className="mt-auto grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col-reverse gap-2 border-t border-border pt-4">
              <dt className="text-small text-text-muted">{m.label}</dt>
              <dd className="text-[clamp(40px,32px+2vw,64px)] leading-none font-light tracking-[-0.04em] text-text">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
