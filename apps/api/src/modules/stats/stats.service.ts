import type { Stats } from "@portfolio/shared";
import type { TtlCache } from "../../lib/cache";
import type { AchievementsRepository } from "../achievements/achievements.repository";
import type { CertificatesRepository } from "../certificates/certificates.repository";
import type { ExperiencesRepository } from "../experiences/experiences.repository";
import type { ProjectsRepository } from "../projects/projects.repository";

/**
 * Whole years of professional experience, rounded to the nearest year (1.7 → 2), never negative.
 * `earliestStart` is a "YYYY-MM-DD" string.
 */
export function yearsOfExperience(earliestStart: string | null, now: Date): number {
  if (!earliestStart) return 0;
  const start = new Date(`${earliestStart}T00:00:00Z`);
  const years = (now.getTime() - start.getTime()) / (365.25 * 86_400_000);
  return Math.max(0, Math.round(years));
}

export class StatsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly experiences: ExperiencesRepository,
    private readonly certificates: CertificatesRepository,
    private readonly achievements: AchievementsRepository,
    private readonly cache: TtlCache,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get(): Promise<Stats> {
    return this.cache.wrap("stats", async () => {
      const [counts, certificates, achievements, earliest] = await Promise.all([
        this.projects.publishedCounts(),
        this.certificates.publishedCount(),
        this.achievements.publishedCount(),
        this.experiences.earliestProfessionalStart(),
      ]);
      return {
        projects: { ...counts, total: counts.web + counts.uiux + counts.data },
        certificates,
        achievements,
        yearsExperience: yearsOfExperience(earliest, this.now()),
      };
    });
  }
}
