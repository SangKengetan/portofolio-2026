import type { CertificateCategory, EmploymentType, ProjectCategory } from "@portfolio/shared";

/** Join class names, skipping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const categoryLabels: Record<CertificateCategory, string> = {
  web: "Web",
  uiux: "UI/UX",
  data: "Data",
  other: "Other",
};

export const projectCategoryOrder: ProjectCategory[] = ["web", "uiux", "data"];

export function isProjectCategory(value: unknown): value is ProjectCategory {
  return value === "web" || value === "uiux" || value === "data";
}

export const employmentLabels: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  internship: "Intern",
  freelance: "Freelance",
  contract: "Contract",
  organization: "Organization",
};

const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const fullDate = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatMonthYear(iso: string) {
  return monthYear.format(new Date(iso));
}

export function formatDate(iso: string) {
  return fullDate.format(new Date(iso));
}

export function yearOf(iso: string) {
  return new Date(iso).getUTCFullYear();
}

/** "Feb 2025 — Jun 2025 · 5 months" */
export function formatPeriod(start: string, end: string | null) {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const months = Math.max(
    1,
    (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1,
  );
  const duration =
    months >= 12
      ? `${Math.floor(months / 12)} yr${months >= 24 ? "s" : ""}${months % 12 ? ` ${months % 12} mo` : ""}`
      : `${months} month${months > 1 ? "s" : ""}`;
  return `${formatMonthYear(start)} — ${end ? formatMonthYear(end) : "Present"} · ${duration}`;
}

/** Splits "I build **web systems**" into plain / bold parts. */
export function parseEmphasis(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? { text: part.slice(2, -2), bold: true }
        : { text: part, bold: false },
    );
}

export function pad2(n: number) {
  return n.toString().padStart(2, "0");
}
