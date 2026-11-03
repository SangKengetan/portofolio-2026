import type {
  Achievement,
  Certificate,
  Experience,
  GithubContributions as GithubData,
  Profile,
  ProjectSummary,
  Stats,
  Technology,
} from "@portfolio/shared";
import { ContactCta } from "@/components/sections/ContactCta";
import { Credentials } from "@/components/sections/Credentials";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { GithubContributions } from "@/components/sections/GithubContributions";
import { Hero } from "@/components/sections/Hero";
import { SelectedProjects } from "@/components/sections/SelectedProjects";
import { Skills } from "@/components/sections/Skills";
import { Statement } from "@/components/sections/Statement";

export interface HomeData {
  profile: Profile;
  stats: Stats;
  experiences: Experience[];
  projects: ProjectSummary[];
  technologies: Technology[];
  certificates: Certificate[];
  achievements: Achievement[];
  contributions: GithubData | null;
}

/** Home — light → dark → light → dark rhythm (section 5.1). */
export function HomeView(data: HomeData) {
  return (
    <>
      <Hero profile={data.profile} stats={data.stats} />
      <Statement profile={data.profile} />
      {data.experiences.length > 0 && <ExperienceSection experiences={data.experiences} />}
      <SelectedProjects projects={data.projects} />
      <Skills technologies={data.technologies} />
      <Credentials certificates={data.certificates} achievements={data.achievements} />
      {data.contributions && <GithubContributions data={data.contributions} />}
      <ContactCta profile={data.profile} />
    </>
  );
}
