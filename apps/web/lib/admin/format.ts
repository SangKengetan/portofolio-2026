import type { AchievementLevel, CertificateCategory, EmploymentType, TechGroup } from "@portfolio/shared";
import type { SelectOption } from "@/components/admin/ui/Field";
import type { PublishStatus } from "./types";

export const statusOptions: SelectOption<PublishStatus>[] = [
  { value: "draft", label: "Draft — hidden from the site" },
  { value: "published", label: "Published — visible on the site" },
  { value: "archived", label: "Archived — hidden, kept for later" },
];

export const projectCategoryOptions: SelectOption<"web" | "uiux" | "data">[] = [
  { value: "web", label: "Web" },
  { value: "uiux", label: "UI/UX" },
  { value: "data", label: "Data" },
];

export const certificateCategoryOptions: SelectOption<CertificateCategory>[] = [...projectCategoryOptions, { value: "other", label: "Other" }];

export const techGroupOptions: SelectOption<TechGroup>[] = [
  { value: "web", label: "Web development" },
  { value: "uiux", label: "UI/UX design" },
  { value: "data", label: "Data analysis" },
  { value: "tools", label: "Tools" },
];

export const employmentOptions: SelectOption<EmploymentType>[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
  { value: "contract", label: "Contract" },
  { value: "organization", label: "Organization" },
];

export const levelOptions: SelectOption<AchievementLevel>[] = [
  { value: "international", label: "International" },
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "university", label: "University" },
  { value: "other", label: "Other" },
];

export const labelOf = <T extends string>(options: SelectOption<T>[], value: T) => options.find((o) => o.value === value)?.label.split(" — ")[0] ?? value;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return "just now";
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

/** "" → null for optional text fields sent to the API. */
export const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
