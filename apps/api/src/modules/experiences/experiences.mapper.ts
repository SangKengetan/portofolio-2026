import type { Experience, Media } from "@portfolio/shared";
import { toTechnology } from "../technologies/technologies.mapper";
import type { TechnologyRow } from "../technologies/technologies.repository";
import type { ExperienceRow } from "./experiences.repository";

export function toExperience(row: ExperienceRow, image: Media | null, techs: TechnologyRow[]): Experience {
  return {
    id: row.id,
    role: row.role,
    company: row.company,
    ...(row.companyUrl ? { companyUrl: row.companyUrl } : {}),
    ...(row.location ? { location: row.location } : {}),
    employmentType: row.employmentType,
    startDate: row.startDate,
    endDate: row.endDate,
    description: row.description ?? "",
    highlights: row.highlights,
    image,
    technologies: techs.map(toTechnology),
  };
}

export const toAdminExperience = (row: ExperienceRow, image: Media | null, techs: TechnologyRow[]) => ({
  ...toExperience(row, image, techs),
  companyUrl: row.companyUrl,
  location: row.location,
  description: row.description,
  imageMediaId: row.imageMediaId,
  technologyIds: techs.map((t) => t.id),
  status: row.status,
  sortOrder: row.sortOrder,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
