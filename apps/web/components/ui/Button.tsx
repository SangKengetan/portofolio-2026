import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "group/btn inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium select-none " +
  "transition-[background-color,color,border-color,transform,box-shadow] duration-200 ease-out " +
  "active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus " +
  "disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "border border-border bg-surface text-text hover:border-text-subtle hover:bg-surface-2",
  ghost: "text-text hover:bg-surface-2",
  danger: "bg-danger text-[#faf9f6] hover:bg-[color-mix(in_srgb,var(--danger)_82%,#000)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-full px-4 text-[13px]",
  md: "h-11 rounded-md px-5 text-[15px]",
  lg: "h-13 rounded-md px-6 text-base",
};

const iconMotion: Partial<Record<IconName, string>> = {
  "arrow-right": "group-hover/btn:translate-x-0.5",
  "arrow-up-right": "group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5",
  download: "group-hover/btn:translate-y-0.5",
  "arrow-left": "group-hover/btn:-translate-x-0.5",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Icon after the label */
  icon?: IconName;
  /** Icon before the label */
  iconLeft?: IconName;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  /** Opens in a new tab with rel="noopener noreferrer" */
  external?: boolean;
  download?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button(props: ButtonProps) {
  const { variant = "primary", size = "md", icon, iconLeft, className, children } = props;
  const iconSize = size === "sm" ? 14 : 16;
  const content = (
    <>
      {iconLeft && <Icon name={iconLeft} size={iconSize} className={cn("transition-transform duration-200", iconMotion[iconLeft])} />}
      <span>{children}</span>
      {icon && <Icon name={icon} size={iconSize} className={cn("transition-transform duration-200", iconMotion[icon])} />}
    </>
  );
  const classes = buttonClasses({ variant, size, className });

  if (props.href !== undefined) {
    const { href, external, download, disabled } = props;
    if (disabled) {
      return (
        <a aria-disabled="true" className={classes} aria-label={props["aria-label"]}>
          {content}
        </a>
      );
    }
    if (external || download || /^(https?:|mailto:|tel:)/.test(href)) {
      return (
        <a
          href={href}
          className={classes}
          aria-label={props["aria-label"]}
          download={download || undefined}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} aria-label={props["aria-label"]}>
        {content}
      </Link>
    );
  }

  const { variant: _v, size: _s, icon: _i, iconLeft: _il, className: _c, children: _ch, type = "button", ...rest } = props;
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
