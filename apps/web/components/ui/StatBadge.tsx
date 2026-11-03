import { Icon, type IconName } from "./Icon";

/** Hero statistic badge, e.g. "5 web projects" (values come from GET /stats). */
export function StatBadge({ icon, value, label }: { icon: IconName; value: number | string; label: string }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 py-1.5 pr-3.5 pl-1.5 text-small text-text-muted backdrop-blur-sm">
      <span className="grid size-7 place-items-center rounded-full bg-surface-2 text-text">
        <Icon name={icon} size={14} />
      </span>
      <span>
        <strong className="font-semibold text-text">{value}</strong> {label}
      </span>
    </li>
  );
}
