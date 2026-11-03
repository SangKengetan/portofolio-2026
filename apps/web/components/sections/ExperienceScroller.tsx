"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Mode = "stack" | "swipe" | "sticky";

/**
 * Experience layout (section 3.4 & 5.1):
 *  - desktop ≥1024px: vertical scroll drives a horizontal track (sticky)
 *  - tablet 768–1023px: native horizontal swipe with snap
 *  - mobile <768px or reduced motion on small screens: vertical stack
 * Reduced-motion users on desktop get the swipe layout instead of scroll-jacking.
 */
export function ExperienceScroller({ header, children }: { header: ReactNode; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const [mode, setMode] = useState<Mode>("swipe");
  const [distance, setDistance] = useState(0);
  const [progress, setProgress] = useState(0);

  // Pick the mode from media queries
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const tablet = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pick = () => setMode(desktop.matches && !reduced.matches ? "sticky" : tablet.matches ? "swipe" : "stack");
    pick();
    [desktop, tablet, reduced].forEach((m) => m.addEventListener("change", pick));
    return () => [desktop, tablet, reduced].forEach((m) => m.removeEventListener("change", pick));
  }, []);

  // Measure how far the track needs to travel
  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      const viewport = viewportRef.current;
      if (!track || !viewport) return;
      setDistance(Math.max(0, track.scrollWidth - viewport.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    if (viewportRef.current) ro.observe(viewportRef.current);
    return () => ro.disconnect();
  }, [mode]);

  // Progress: page scroll (sticky) or horizontal scroll (swipe)
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (mode === "sticky") {
        const outer = outerRef.current;
        if (!outer || distance === 0) return setProgress(0);
        const travelled = -outer.getBoundingClientRect().top;
        setProgress(Math.min(1, Math.max(0, travelled / distance)));
      } else if (mode === "swipe") {
        const vp = viewportRef.current;
        if (!vp) return;
        const max = vp.scrollWidth - vp.clientWidth;
        setProgress(max > 0 ? vp.scrollLeft / max : 0);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    const target: Window | HTMLDivElement | null = mode === "sticky" ? window : viewportRef.current;
    target?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target?.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [mode, distance]);

  const sticky = mode === "sticky";

  return (
    <div ref={outerRef} style={sticky ? { height: `calc(100vh + ${distance}px)` } : undefined}>
      <div className={cn(sticky && "sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-[var(--nav-h)] pb-8")}>
        {header}
        <div
          ref={viewportRef}
          tabIndex={mode === "swipe" ? 0 : undefined}
          aria-label={mode === "swipe" ? "Experiences, scroll horizontally" : undefined}
          className={cn(
            "mt-10 md:mt-12",
            mode === "swipe" && "no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-px-[var(--gutter)]",
            sticky && "overflow-visible",
          )}
        >
          <ol
            ref={trackRef}
            className={cn(
              "flex gap-4 md:gap-6",
              mode === "stack" ? "container-site flex-col" : "w-max flex-row px-[var(--gutter)] xl:px-[max(var(--gutter),calc((100vw_-_var(--container))_/_2))]",
              sticky && "will-change-transform",
            )}
            style={sticky ? { transform: `translate3d(${-progress * distance}px,0,0)` } : undefined}
          >
            {children}
          </ol>
        </div>

        {mode !== "stack" && (
          <div className="container-site mt-8" aria-hidden="true">
            <div className="h-px w-full bg-border">
              <div className="h-px origin-left bg-text" style={{ transform: `scaleX(${Math.max(0.04, progress)})` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
