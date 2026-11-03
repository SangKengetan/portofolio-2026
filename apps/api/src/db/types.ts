import type { ColumnType, Generated } from "kysely";

/**
 * Kysely table types. Property names are the camelCase form of the PostgreSQL columns
 * (CamelCasePlugin converts both ways), e.g. `projects.cover_media_id` ⇄ `coverMediaId`.
 *
 * - DATE columns are returned as "YYYY-MM-DD" strings (see db/client.ts).
 * - JSONB columns are read as objects but must be written as JSON strings (JSON.stringify).
 */

type Timestamp = Generated<Date>;
type NullableTimestamp = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
/** JSONB with a database default. */
type Json<T> = ColumnType<T, string | undefined, string>;

export type ProjectCategory = "web" | "uiux" | "data";
export type PublishStatus = "draft" | "published" | "archived";
export type BlockTypeName =
  | "rich_text"
  | "image"
  | "gallery"
  | "before_after"
  | "metrics"
  | "quote"
  | "embed"
  | "code"
  | "list";
export type TechGroupName = "web" | "uiux" | "data" | "tools";
export type EmploymentTypeName =
  | "full_time"
  | "part_time"
  | "internship"
  | "freelance"
  | "contract"
  | "organization";
export type AchievementLevelName = "international" | "national" | "regional" | "university" | "other";
export type CertificateCategoryName = "web" | "uiux" | "data" | "other";

export interface AdminUsersTable {
  id: Generated<string>;
  email: string;
  passwordHash: string;
  name: string;
  lastLoginAt: NullableTimestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: NullableTimestamp;
  replacedBy: string | null;
  userAgent: string | null;
  ipHash: string | null;
  createdAt: Timestamp;
}

export interface MediaTable {
  id: Generated<string>;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  variants: Json<Record<string, string>>;
  createdAt: Timestamp;
}

export interface SiteProfileTable {
  id: Generated<number>;
  fullName: string;
  shortName: string;
  roles: Generated<string[]>;
  headline: string | null;
  statement: string | null;
  bio: string | null;
  location: string | null;
  timezone: Generated<string>;
  email: string | null;
  phone: string | null;
  handle: string | null;
  availableForWork: Generated<boolean>;
  socials: Json<Record<string, string>>;
  photoMediaId: string | null;
  cvMediaId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Timestamp;
}

export interface TechnologiesTable {
  id: Generated<number>;
  name: string;
  slug: string;
  grp: TechGroupName;
  iconKey: string | null;
  showOnHome: Generated<boolean>;
  sortOrder: Generated<number>;
}

export interface ProjectsTable {
  id: Generated<string>;
  slug: string;
  title: string;
  category: ProjectCategory;
  summary: string;
  impactLine: string | null;
  impactStatement: string | null;
  role: string | null;
  team: string | null;
  client: string | null;
  year: number | null;
  startedAt: string | null;
  endedAt: string | null;
  contributions: Generated<string[]>;
  coverMediaId: string | null;
  demoUrl: string | null;
  repoUrl: string | null;
  figmaUrl: string | null;
  dashboardUrl: string | null;
  notebookUrl: string | null;
  meta: Json<Record<string, unknown>>;
  status: Generated<PublishStatus>;
  isFeatured: Generated<boolean>;
  sortOrder: Generated<number>;
  seoDescription: string | null;
  publishedAt: NullableTimestamp;
  deletedAt: NullableTimestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProjectMetricsTable {
  id: Generated<number>;
  projectId: string;
  value: string;
  label: string;
  sortOrder: Generated<number>;
}

export interface ProjectBlocksTable {
  id: Generated<string>;
  projectId: string;
  type: BlockTypeName;
  heading: string | null;
  data: Json<Record<string, unknown>>;
  sortOrder: Generated<number>;
}

export interface ProjectTechnologiesTable {
  projectId: string;
  technologyId: number;
  sortOrder: Generated<number>;
}

export interface ExperiencesTable {
  id: Generated<string>;
  role: string;
  company: string;
  companyUrl: string | null;
  location: string | null;
  employmentType: EmploymentTypeName;
  startDate: string;
  endDate: string | null;
  description: string | null;
  highlights: Generated<string[]>;
  imageMediaId: string | null;
  status: Generated<PublishStatus>;
  sortOrder: Generated<number>;
  deletedAt: NullableTimestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExperienceTechnologiesTable {
  experienceId: string;
  technologyId: number;
  sortOrder: Generated<number>;
}

export interface CertificatesTable {
  id: Generated<string>;
  title: string;
  issuer: string;
  category: Generated<CertificateCategoryName>;
  issuedAt: string;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  imageMediaId: string | null;
  issuerLogoMediaId: string | null;
  isFeatured: Generated<boolean>;
  status: Generated<PublishStatus>;
  sortOrder: Generated<number>;
  deletedAt: NullableTimestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AchievementsTable {
  id: Generated<string>;
  title: string;
  organizer: string | null;
  level: Generated<AchievementLevelName>;
  rankLabel: string | null;
  achievedAt: string;
  description: string | null;
  linkUrl: string | null;
  imageMediaId: string | null;
  relatedProjectId: string | null;
  status: Generated<PublishStatus>;
  sortOrder: Generated<number>;
  deletedAt: NullableTimestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ContactMessagesTable {
  id: Generated<string>;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  ipHash: string | null;
  isRead: Generated<boolean>;
  createdAt: Timestamp;
}

export interface Database {
  adminUsers: AdminUsersTable;
  refreshTokens: RefreshTokensTable;
  media: MediaTable;
  siteProfile: SiteProfileTable;
  technologies: TechnologiesTable;
  projects: ProjectsTable;
  projectMetrics: ProjectMetricsTable;
  projectBlocks: ProjectBlocksTable;
  projectTechnologies: ProjectTechnologiesTable;
  experiences: ExperiencesTable;
  experienceTechnologies: ExperienceTechnologiesTable;
  certificates: CertificatesTable;
  achievements: AchievementsTable;
  contactMessages: ContactMessagesTable;
}
