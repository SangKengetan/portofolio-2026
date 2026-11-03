import { NotFoundView } from "@/components/views/NotFoundView";
import { getProfile, getProjects } from "@/lib/api";

/** Root 404 (Next.js adds noindex automatically) with the terminal easter egg. */
export default async function NotFound() {
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  return (
    <NotFoundView
      data={{
        name: profile.fullName,
        roles: profile.roles,
        location: profile.location,
        email: profile.email,
        cvUrl: profile.cvUrl,
        projects: projects.map((p) => ({ title: p.title, slug: p.slug, category: p.category })),
      }}
    />
  );
}
