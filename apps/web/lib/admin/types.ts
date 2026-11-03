/**
 * Shapes returned by the admin endpoints of apps/api (`/v1/admin/*`, `/v1/auth/*`).
 * They mirror the mappers in apps/api/src/modules/<module>/<module>.mapper.ts.
 */
import type {
  AchievementLevel,
  BlockType,
  CertificateCategory,
  EmploymentType,
  ImageFrame,
  Media,
  ProjectCategory,
  ProjectMetric,
  Socials,
  TechGroup,
} from "@portfolio/shared";

export type PublishStatus = "draft" | "published" | "archived";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  lastLoginAt: string | null;
}

export interface DashboardSummary {
  projects: { published: number; draft: number; archived: number };
  experiences: number;
  certificates: number;
  achievements: number;
  technologies: number;
  media: number;
  messages: { total: number; unread: number };
}

export interface AdminProfile {
  fullName: string;
  shortName: string;
  roles: string[];
  headline: string | null;
  statement: string | null;
  bio: string | null;
  location: string | null;
  timezone: string;
  email: string | null;
  phone: string | null;
  handle: string | null;
  availableForWork: boolean;
  socials: Socials;
  photo: Media | null;
  cvUrl: string | null;
  photoMediaId: string | null;
  cvMediaId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

export interface AdminTechnology {
  id: number;
  name: string;
  slug: string;
  group: TechGroup;
  iconKey: string | null;
  showOnHome: boolean;
  sortOrder: number;
}

export interface AdminProjectListItem {
  id: string;
  slug: string;
  title: string;
  category: ProjectCategory;
  summary: string;
  status: PublishStatus;
  isFeatured: boolean;
  sortOrder: number;
  year: number | null;
  cover: Media | null;
  technologies: string[];
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Case-study blocks as stored (media by id) — apps/api/src/modules/projects/blocks.ts ---------- */
interface StoredBlockBase {
  /** Present for saved blocks; new blocks get a temporary client id. */
  id: string;
  heading: string | null;
}
export type StoredBlock =
  | (StoredBlockBase & { type: "rich_text"; data: { html: string } })
  | (StoredBlockBase & { type: "image"; data: { mediaId: string; caption?: string | null; frame?: ImageFrame } })
  | (StoredBlockBase & {
      type: "gallery";
      data: { items: { mediaId: string; caption?: string | null }[]; columns?: 2 | 3 };
    })
  | (StoredBlockBase & {
      type: "before_after";
      data: { beforeMediaId: string; afterMediaId: string; caption?: string | null };
    })
  | (StoredBlockBase & { type: "metrics"; data: { items: ProjectMetric[] } })
  | (StoredBlockBase & { type: "quote"; data: { text: string; author?: string | null } })
  | (StoredBlockBase & {
      type: "embed";
      data: { provider: "figma" | "tableau" | "looker" | "youtube"; url: string; title?: string | null };
    })
  | (StoredBlockBase & { type: "code"; data: { language: string; code: string } })
  | (StoredBlockBase & { type: "list"; data: { style: "bullet" | "numbered"; items: string[] } });

export type StoredBlockOf<T extends BlockType> = Extract<StoredBlock, { type: T }>;

export interface AdminProjectDetail extends AdminProjectListItem {
  impactLine: string | null;
  impactStatement: string | null;
  role: string | null;
  team: string | null;
  client: string | null;
  startedAt: string | null;
  endedAt: string | null;
  contributions: string[];
  coverMediaId: string | null;
  demoUrl: string | null;
  repoUrl: string | null;
  figmaUrl: string | null;
  dashboardUrl: string | null;
  notebookUrl: string | null;
  meta: Record<string, unknown>;
  seoDescription: string | null;
  technologyIds: number[];
  technologyDetails: AdminTechnology[];
  metrics: ProjectMetric[];
  blocks: Array<StoredBlock & { sortOrder: number }>;
}

export interface AdminExperience {
  id: string;
  role: string;
  company: string;
  companyUrl: string | null;
  location: string | null;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string | null;
  description: string | null;
  highlights: string[];
  image: Media | null;
  imageMediaId: string | null;
  technologyIds: number[];
  status: PublishStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCertificate {
  id: string;
  title: string;
  issuer: string;
  category: CertificateCategory;
  issuedAt: string;
  expiresAt: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
  image: Media | null;
  issuerLogo: Media | null;
  imageMediaId: string | null;
  issuerLogoMediaId: string | null;
  isFeatured: boolean;
  status: PublishStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAchievement {
  id: string;
  title: string;
  organizer: string | null;
  level: AchievementLevel;
  rankLabel: string | null;
  achievedAt: string;
  description: string | null;
  linkUrl: string | null;
  image: { id: string; url: string; alt: string } | null;
  imageMediaId: string | null;
  relatedProjectId: string | null;
  status: PublishStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMedia {
  id: string;
  url: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  /** Absolute URLs of the WebP sizes (sm 480 / md 960 / lg 1600) — empty for PDFs. */
  variants: Partial<Record<"sm" | "md" | "lg", string>>;
  createdAt: string;
}

export interface AdminMessage {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}
