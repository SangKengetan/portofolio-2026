import type { Technology } from "@portfolio/shared";
import type { TechnologyRow } from "./technologies.repository";

export const toTechnology = (r: TechnologyRow): Technology => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  group: r.grp,
  ...(r.iconKey ? { iconKey: r.iconKey } : {}),
});

export const toAdminTechnology = (r: TechnologyRow) => ({
  ...toTechnology(r),
  iconKey: r.iconKey,
  showOnHome: r.showOnHome,
  sortOrder: r.sortOrder,
});
