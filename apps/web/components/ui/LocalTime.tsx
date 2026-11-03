"use client";

import { useEffect, useState } from "react";

/** Live local time in the owner's timezone, e.g. "14:05 WITA" (footer & fullscreen menu). */
export function LocalTime({ timezone, className }: { timezone: string; className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className={className}>--:--</span>;
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short",
  }).format(now);
  return (
    <time className={className} dateTime={now.toISOString()} suppressHydrationWarning>
      {time}
    </time>
  );
}
