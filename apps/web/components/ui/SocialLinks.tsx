import type { Socials } from "@portfolio/shared";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

const order: Array<{ key: keyof Socials; icon: IconName; label: string }> = [
  { key: "github", icon: "github", label: "GitHub" },
  { key: "linkedin", icon: "linkedin", label: "LinkedIn" },
  { key: "dribbble", icon: "dribbble", label: "Dribbble" },
  { key: "behance", icon: "pen-tool", label: "Behance" },
  { key: "instagram", icon: "instagram", label: "Instagram" },
];

interface SocialLinksProps {
  socials: Socials;
  email?: string;
  /** "icon" = small icon buttons, "pill" = labelled pills */
  variant?: "icon" | "pill";
  className?: string;
}

export function SocialLinks({ socials, email, variant = "icon", className }: SocialLinksProps) {
  const items = order
    .filter((o) => socials[o.key])
    .map((o) => ({ ...o, href: socials[o.key]! }));
  if (email) items.push({ key: "github", icon: "mail", label: "Email", href: `mailto:${email}` });

  return (
    <ul className={cn("flex flex-wrap items-center", variant === "icon" ? "gap-1" : "gap-2", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <a
            href={item.href}
            target={item.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
            aria-label={variant === "icon" ? item.label : undefined}
            className={cn(
              "inline-flex items-center gap-2 transition-colors duration-200",
              variant === "icon"
                ? "size-9 justify-center rounded-full text-text-muted hover:bg-surface-2 hover:text-text"
                : "h-10 rounded-full border border-border px-4 text-small text-text-muted hover:border-text-muted hover:text-text",
            )}
          >
            <Icon name={item.icon} size={variant === "icon" ? 17 : 16} />
            {variant === "pill" && <span>{item.label}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}
