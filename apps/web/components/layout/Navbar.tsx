"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@portfolio/shared";
import { navLinks } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { FullscreenMenu } from "./FullscreenMenu";

type NavProfile = Pick<Profile, "shortName" | "location" | "timezone" | "socials" | "email">;

/**
 * Sticky, transparent navbar. Its colours follow the section underneath it:
 * any section with data-theme="dark" flips the bar to the dark variant.
 */
export function Navbar({ profile }: { profile: NavProfile }) {
  const pathname = usePathname();
  const [variant, setVariant] = useState<"light" | "dark">("light");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
      const header = headerRef.current;
      const y = (header?.offsetHeight ?? 72) / 2;
      const stack = document.elementsFromPoint(window.innerWidth / 2, y);
      const below = stack.find((el) => !header?.contains(el));
      const themed = below?.closest<HTMLElement>("[data-theme]");
      setVariant(themed?.dataset.theme === "dark" ? "dark" : "light");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  return (
    <>
      <header
        ref={headerRef}
        data-theme={variant}
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300",
          scrolled
            ? "bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] shadow-[0_1px_0_var(--border)] backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <nav aria-label="Main" className="container-site flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Link href="/" className="group flex items-center gap-3 rounded-full" aria-label={`${profile.shortName} / Portfolio — home`}>
            <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-accent font-serif text-lg text-accent-fg italic transition-transform duration-300 group-hover:rotate-[-8deg]">
              {profile.shortName.charAt(0)}
            </span>
            <span className="text-label text-text">
              {profile.shortName} <span className="text-text-subtle">/ Portfolio</span>
            </span>
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = link.href === pathname || (link.href !== "/" && !link.href.includes("#") && pathname.startsWith(link.href));
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3 py-2 text-small transition-colors duration-200 hover:text-text",
                      active ? "text-text" : "text-text-muted",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="fullscreen-menu"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-4 text-label text-text transition-colors duration-200 hover:bg-surface-2 active:translate-y-px"
          >
            Menu
            <Icon name="plus" size={14} />
          </button>
        </nav>
      </header>

      <FullscreenMenu open={menuOpen} onClose={closeMenu} profile={profile} />
    </>
  );
}
