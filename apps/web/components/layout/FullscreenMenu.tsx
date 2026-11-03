"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import type { Profile } from "@portfolio/shared";
import { menuLinks } from "@/lib/site";
import { cn, pad2 } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { LocalTime } from "@/components/ui/LocalTime";
import { SocialLinks } from "@/components/ui/SocialLinks";

interface FullscreenMenuProps {
  open: boolean;
  onClose: () => void;
  profile: Pick<Profile, "location" | "timezone" | "socials" | "email">;
}

/** Dark panel sliding in from the right (section 5.5). Focus-trapped, closes with Esc. */
export function FullscreenMenu({ open, onClose, profile }: FullscreenMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      id="fullscreen-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      aria-hidden={!open}
      inert={!open}
      className={cn("fixed inset-0 z-50", open ? "visible" : "invisible delay-500")}
    >
      {/* Backdrop / left column */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-[rgba(26,26,24,0.55)] backdrop-blur-[2px] transition-opacity duration-500",
          open ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          data-theme="dark"
          className="absolute bottom-8 left-[var(--gutter)] hidden flex-col gap-1 bg-transparent lg:flex lg:left-10"
        >
          <span className="text-label text-text-muted">Based in</span>
          <span className="text-body-lg text-text">{profile.location}</span>
          <LocalTime timezone={profile.timezone} className="text-label text-text-muted" />
        </div>
      </div>

      {/* Panel */}
      <div
        ref={panelRef}
        data-theme="dark"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-bg px-[var(--gutter)] pt-5 pb-8 md:px-10 lg:w-[58%] xl:w-[52%]",
          "transition-transform duration-[var(--dur-menu)] ease-[var(--ease-out)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-[calc(var(--nav-h)_-_20px)] items-center justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-label text-accent-fg transition-colors duration-200 hover:bg-accent-hover active:translate-y-px"
          >
            Close
            <Icon name="x" size={14} />
          </button>
        </div>

        <nav aria-label="Menu" className="mt-6 flex-1 overflow-y-auto">
          <ol className="flex flex-col">
            {menuLinks.map((link, i) => (
              <li
                key={link.href}
                style={{ transitionDelay: open ? `${120 + i * 55}ms` : "0ms" } satisfies CSSProperties}
                className={cn(
                  "transition-[opacity,transform] duration-500 ease-[var(--ease-out)]",
                  open ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0",
                )}
              >
                <Link
                  href={link.href}
                  onClick={onClose}
                  className="group flex items-baseline justify-between gap-4 border-b border-border py-2.5 md:py-3"
                >
                  <span className="text-[clamp(34px,6vw,64px)] leading-[1] font-medium tracking-[-0.03em] text-text uppercase transition-[color,transform] duration-300 group-hover:translate-x-2 group-hover:text-text-muted">
                    {link.label}
                  </span>
                  <span className="text-label text-text-subtle">{pad2(i + 1)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <a href={`mailto:${profile.email}`} className="text-body-lg text-text underline-offset-4 hover:underline">
            {profile.email}
          </a>
          <SocialLinks socials={profile.socials} />
        </div>
      </div>
    </div>
  );
}
