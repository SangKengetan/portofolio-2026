import type { ReactNode } from "react";

/** Re-mounts on every navigation → 200ms fade between pages (section 3.4). */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-fade">{children}</div>;
}
