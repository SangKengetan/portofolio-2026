import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";
import {
  getAchievements,
  getCertificates,
  getExperiences,
  getGithubContributions,
  getProfile,
  getProjects,
  getStats,
  getTechnologies,
} from "@/lib/api";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function HomePage() {
  const [profile, stats, experiences, projects, technologies, certificates, achievements, contributions] = await Promise.all([
    getProfile(),
    getStats(),
    getExperiences(),
    getProjects(),
    getTechnologies(),
    getCertificates({ featured: true }),
    getAchievements(),
    // Optional section: never break the home page if GitHub data is unavailable.
    getGithubContributions().catch(() => null),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName,
    jobTitle: profile.roles[0],
    description: profile.headline,
    email: `mailto:${profile.email}`,
    url: siteUrl,
    image: profile.photo ? new URL(profile.photo.url, siteUrl).toString() : undefined,
    sameAs: Object.values(profile.socials).filter(Boolean),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <HomeView
        profile={profile}
        stats={stats}
        experiences={experiences}
        projects={projects}
        technologies={technologies}
        certificates={certificates}
        achievements={achievements}
        contributions={contributions}
      />
    </>
  );
}
