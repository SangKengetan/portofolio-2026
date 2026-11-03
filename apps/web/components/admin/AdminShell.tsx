"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useAuth, useCounts } from "./AdminProviders";
import { Spinner } from "./ui/Primitives";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: "unread";
}

/** Sidebar order follows rancangan §11. */
const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "layout-dashboard" },
  { href: "/admin/profile", label: "Profile", icon: "user" },
  { href: "/admin/projects", label: "Projects", icon: "folder" },
  { href: "/admin/experiences", label: "Experience", icon: "briefcase" },
  { href: "/admin/skills", label: "Skills", icon: "layers" },
  { href: "/admin/certificates", label: "Certificates", icon: "award" },
  { href: "/admin/achievements", label: "Achievements", icon: "trophy" },
  { href: "/admin/media", label: "Media", icon: "image" },
  { href: "/admin/messages", label: "Messages", icon: "inbox", badge: "unread" },
];

const isActive = (pathname: string, href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { summary } = useCounts();
  const unread = summary?.messages.unread ?? 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="grid size-8 place-items-center rounded-full bg-accent font-serif text-lg text-accent-fg italic" aria-hidden="true">
          A
        </span>
        <span className="text-label text-text">
          Portfolio <span className="text-text-subtle">/ Admin</span>
        </span>
      </div>

      <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-md px-3 text-[14px] transition-colors duration-150",
                    active ? "bg-surface-2 font-medium text-text" : "text-text-muted hover:bg-surface-2/60 hover:text-text",
                  )}
                >
                  <Icon name={item.icon} size={17} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge === "unread" && unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 font-mono text-[11px] text-accent-fg">
                      <span className="sr-only">{unread} unread</span>
                      <span aria-hidden="true">{unread > 99 ? "99+" : unread}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 items-center gap-3 rounded-md px-3 text-[13px] text-text-muted hover:bg-surface-2/60 hover:text-text"
        >
          <Icon name="arrow-up-right" size={16} />
          View site
        </a>
        <Link
          href="/admin/account"
          onClick={onNavigate}
          aria-current={pathname === "/admin/account" ? "page" : undefined}
          className={cn(
            "flex h-9 items-center gap-3 rounded-md px-3 text-[13px] hover:bg-surface-2/60 hover:text-text",
            pathname === "/admin/account" ? "bg-surface-2 text-text" : "text-text-muted",
          )}
        >
          <Icon name="key" size={16} />
          Account
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-[13px] text-text-muted hover:bg-surface-2/60 hover:text-text"
        >
          <Icon name="log-out" size={16} />
          Sign out
        </button>
        {user && (
          <p className="mt-2 truncate px-3 text-[12px] text-text-subtle" title={user.email}>
            {user.email}
          </p>
        )}
      </div>
    </div>
  );
}

/** Admin layout: fixed sidebar on desktop, slide-in drawer on mobile. Renders nothing until signed in. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  if (status !== "authenticated") {
    return (
      <div className="grid min-h-dvh place-items-center bg-bg text-text-muted">
        <span className="flex items-center gap-3 text-[14px]">
          <Spinner /> Checking your session…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#admin-main" className="fixed top-3 left-3 z-[60] -translate-y-20 rounded-md bg-accent px-4 py-2 text-small text-accent-fg focus:translate-y-0">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[248px] border-r border-border bg-surface lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="admin-drawer"
          className="inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-label text-text"
        >
          <Icon name="menu" size={15} />
          Menu
        </button>
        <span className="text-label text-text-subtle">Admin</span>
      </div>
      <div className={cn("fixed inset-0 z-40 lg:hidden", drawerOpen ? "visible" : "invisible delay-300")} aria-hidden={!drawerOpen} inert={!drawerOpen}>
        <div onClick={() => setDrawerOpen(false)} className={cn("absolute inset-0 bg-[rgba(26,26,24,0.45)] transition-opacity duration-300", drawerOpen ? "opacity-100" : "opacity-0")} />
        <aside
          id="admin-drawer"
          aria-label="Admin menu"
          className={cn(
            "absolute inset-y-0 left-0 w-[min(280px,85vw)] border-r border-border bg-surface transition-transform duration-300 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </aside>
      </div>

      <main id="admin-main" tabIndex={-1} className="outline-none lg:pl-[248px]">
        <div className="mx-auto w-full max-w-[1160px] px-4 py-6 md:px-8 md:py-10">{children}</div>
      </main>
    </div>
  );
}
