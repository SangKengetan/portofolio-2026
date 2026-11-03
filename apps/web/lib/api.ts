/**
 * Data access for the public site (section 10.1).
 *
 * - With API_URL set → fetches from the Express API, cached by Next.js (ISR) and
 *   refreshed on demand by POST /api/revalidate (section 7, step 3).
 * - Without API_URL → returns the mock data in lib/mock-data.ts.
 *
 * Server-only: call these from Server Components, route handlers or generateMetadata.
 */
import type {
  Achievement,
  ApiResponse,
  Certificate,
  CertificateCategory,
  Experience,
  GithubContributions,
  Profile,
  ProjectCategory,
  ProjectDetail,
  ProjectSummary,
  Stats,
  Technology,
} from "@portfolio/shared";
import {
  mockAchievements,
  mockCertificates,
  mockContributions,
  mockExperiences,
  mockProfile,
  mockProjectDetail,
  mockProjects,
  mockStats,
  mockTechnologies,
} from "./mock-data";

const API_URL = process.env.API_URL?.replace(/\/$/, "");

/** Fallback revalidation window; content changes trigger on-demand revalidation anyway. */
const REVALIDATE_SECONDS = 3600;

class ApiRequestError extends Error {
  constructor(
    public status: number,
    path: string,
  ) {
    super(`API ${status} on ${path}`);
  }
}

async function get<T>(path: string, tags: string[], mock: () => T): Promise<T> {
  if (!API_URL) return mock();
  const res = await fetch(`${API_URL}/v1${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: REVALIDATE_SECONDS, tags },
  });
  if (!res.ok) throw new ApiRequestError(res.status, path);
  const body = (await res.json()) as ApiResponse<T>;
  return body.data;
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) s.set(k, String(v));
  const str = s.toString();
  return str ? `?${str}` : "";
};

/** Shown until the profile is filled in /admin/profile (a fresh database has no profile row yet). */
const emptyProfile: Profile = {
  fullName: "Your Name",
  shortName: "Your Name",
  roles: [],
  headline: "",
  statement: "",
  bio: "",
  location: "",
  timezone: "Asia/Makassar",
  email: "",
  handle: "",
  availableForWork: false,
  socials: {},
  photo: null,
  cvUrl: null,
};

export async function getProfile(): Promise<Profile> {
  try {
    return await get<Profile>("/profile", ["profile"], () => mockProfile);
  } catch (err) {
    // 404 PROFILE_NOT_SET: the site (and /admin) must keep working so the owner can create the profile.
    if (err instanceof ApiRequestError && err.status === 404) return emptyProfile;
    throw err;
  }
}

export const getStats = () => get<Stats>("/stats", ["stats"], () => mockStats);

export const getExperiences = () => get<Experience[]>("/experiences", ["experiences"], () => mockExperiences);

export const getTechnologies = () =>
  get<Technology[]>("/technologies", ["technologies"], () => mockTechnologies);

export function getProjects(opts: { category?: ProjectCategory; featured?: boolean } = {}) {
  return get<ProjectSummary[]>(`/projects${qs(opts)}`, ["projects"], () =>
    mockProjects.filter(
      (p) =>
        (!opts.category || p.category === opts.category) &&
        (opts.featured === undefined || p.isFeatured === opts.featured),
    ),
  );
}

/** Returns null when the project does not exist (→ notFound()). */
export async function getProject(slug: string): Promise<ProjectDetail | null> {
  try {
    return await get<ProjectDetail | null>(`/projects/${encodeURIComponent(slug)}`, ["projects", `project:${slug}`], () =>
      mockProjectDetail(slug),
    );
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

export function getCertificates(opts: { category?: CertificateCategory; featured?: boolean } = {}) {
  return get<Certificate[]>(`/certificates${qs(opts)}`, ["certificates"], () =>
    mockCertificates.filter(
      (c) =>
        (!opts.category || c.category === opts.category) &&
        (opts.featured === undefined || c.isFeatured === opts.featured),
    ),
  );
}

export const getAchievements = () =>
  get<Achievement[]>("/achievements", ["achievements"], () => mockAchievements);

/** Not in the original API table — the API caches GitHub's GraphQL contribution calendar. */
export const getGithubContributions = () =>
  get<GithubContributions>("/github/contributions", ["github"], () => mockContributions);
