/**
 * Shared types — the shape of the JSON returned by the public API (section 10.1 of the plan).
 * Field names are camelCase versions of the PostgreSQL columns (section 9).
 * Media relations (`*_media_id`) are resolved by the API into `Media` objects.
 */

export type ProjectCategory = "web" | "uiux" | "data";
export type CertificateCategory = ProjectCategory | "other";
export type TechGroup = "web" | "uiux" | "data" | "tools";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "internship"
  | "freelance"
  | "contract"
  | "organization";
export type AchievementLevel = "international" | "national" | "regional" | "university" | "other";

export interface Media {
  id: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface Socials {
  github?: string;
  linkedin?: string;
  dribbble?: string;
  behance?: string;
  instagram?: string;
}

/** GET /profile */
export interface Profile {
  fullName: string;
  shortName: string;
  /** Rotated by the typing effect in the hero. */
  roles: string[];
  headline: string;
  /** Statement section. Wrap keywords in **double asterisks** to render them bold. */
  statement: string;
  bio: string;
  location: string;
  timezone: string;
  email: string;
  phone?: string;
  handle: string;
  availableForWork: boolean;
  socials: Socials;
  photo: Media | null;
  cvUrl: string | null;
  seoTitle?: string;
  seoDescription?: string;
}

/** GET /stats */
export interface Stats {
  projects: Record<ProjectCategory, number> & { total: number };
  certificates: number;
  achievements: number;
  yearsExperience: number;
}

/** GET /technologies */
export interface Technology {
  id: number;
  name: string;
  slug: string;
  group: TechGroup;
  iconKey?: string;
}

/** GET /experiences */
export interface Experience {
  id: string;
  role: string;
  company: string;
  companyUrl?: string;
  location?: string;
  employmentType: EmploymentType;
  /** ISO date, e.g. "2025-02-01" */
  startDate: string;
  /** null = present */
  endDate: string | null;
  description: string;
  highlights: string[];
  image: Media | null;
  technologies: Technology[];
}

export interface ProjectMetric {
  value: string;
  label: string;
}

/** Item in GET /projects */
export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  summary: string;
  impactLine: string | null;
  year: number | null;
  cover: Media | null;
  isFeatured: boolean;
  /** Tech names for the card. */
  technologies: string[];
  publishedAt: string;
}

/* ---------- Case study blocks (section 9.3) ---------- */
interface BlockBase {
  id: string;
  heading: string | null;
}
export type ImageFrame = "browser" | "device" | "none";
export interface RichTextBlock extends BlockBase { type: "rich_text"; data: { html: string } }
export interface ImageBlock extends BlockBase { type: "image"; data: { media: Media; caption?: string; frame?: ImageFrame } }
export interface GalleryBlock extends BlockBase { type: "gallery"; data: { items: { media: Media; caption?: string }[]; columns?: 2 | 3 } }
export interface BeforeAfterBlock extends BlockBase { type: "before_after"; data: { before: Media; after: Media; caption?: string } }
export interface MetricsBlock extends BlockBase { type: "metrics"; data: { items: ProjectMetric[] } }
export interface QuoteBlock extends BlockBase { type: "quote"; data: { text: string; author?: string } }
export interface EmbedBlock extends BlockBase {
  type: "embed";
  data: { provider: "figma" | "tableau" | "looker" | "youtube"; url: string; title?: string };
}
export interface CodeBlock extends BlockBase { type: "code"; data: { language: string; code: string } }
export interface ListBlock extends BlockBase { type: "list"; data: { style: "bullet" | "numbered"; items: string[] } }

export type ProjectBlock =
  | RichTextBlock
  | ImageBlock
  | GalleryBlock
  | BeforeAfterBlock
  | MetricsBlock
  | QuoteBlock
  | EmbedBlock
  | CodeBlock
  | ListBlock;

export type BlockType = ProjectBlock["type"];

/** GET /projects/:slug */
export interface ProjectDetail extends Omit<ProjectSummary, "technologies"> {
  impactStatement: string | null;
  role: string | null;
  team: string | null;
  client: string | null;
  startedAt: string | null;
  endedAt: string | null;
  contributions: string[];
  demoUrl: string | null;
  repoUrl: string | null;
  figmaUrl: string | null;
  dashboardUrl: string | null;
  notebookUrl: string | null;
  metrics: ProjectMetric[];
  blocks: ProjectBlock[];
  technologies: Technology[];
  seoDescription: string | null;
  nextProject: ProjectSummary | null;
}

/** GET /certificates */
export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  category: CertificateCategory;
  issuedAt: string;
  expiresAt: string | null;
  credentialId: string | null;
  /** Present → "Verified" badge */
  credentialUrl: string | null;
  image: Media | null;
  issuerLogo: Media | null;
  isFeatured: boolean;
}

/** GET /achievements */
export interface Achievement {
  id: string;
  title: string;
  organizer: string | null;
  level: AchievementLevel;
  rankLabel: string | null;
  achievedAt: string;
  description: string | null;
  linkUrl: string | null;
}

/** GET /github/contributions — cached by the API from the GitHub GraphQL API. */
export interface ContributionDay {
  date: string;
  count: number;
  /** 0 (none) – 4 (most) */
  level: 0 | 1 | 2 | 3 | 4;
}
export interface GithubContributions {
  username: string;
  profileUrl: string;
  totalLastYear: number;
  longestStreak: number;
  /** Percentage of days with at least one contribution. */
  activeDaysPercent: number;
  /** Columns of 7 days (Sunday → Saturday), oldest first. */
  weeks: ContributionDay[][];
}

/**
 * Envelope used by every API response.
 * `success`, `message` and `meta` are always sent by the Express API; they are optional here so the
 * mock data layer (and older code) that only returns `{ data }` keeps type-checking.
 */
export interface ApiResponse<T> {
  success?: true;
  message?: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  success?: false;
  message?: string;
  error: { code: string; message: string; fields?: Record<string, string> };
  /** Same value as the `x-request-id` response header — quote it when reporting a problem. */
  requestId?: string;
}
