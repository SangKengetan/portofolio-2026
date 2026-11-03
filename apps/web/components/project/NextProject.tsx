import Link from "next/link";
import type { ProjectSummary } from "@portfolio/shared";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";

export function NextProject({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      data-theme="dark"
      className="group grid items-center gap-8 overflow-hidden rounded-xl bg-bg p-6 transition-colors duration-300 hover:bg-surface md:grid-cols-[1fr_1.1fr] md:p-10"
    >
      <div>
        <p className="text-label text-text-subtle">Next project</p>
        <p className="mt-4 text-h1 text-text">{project.title}</p>
        <div className="mt-5 flex items-center gap-3">
          <Chip category={project.category} />
          <span className="inline-flex items-center gap-2 text-small text-text-muted transition-colors group-hover:text-text">
            Read case study
            <Icon name="arrow-right" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </div>
      </div>
      <MediaFrame
        media={project.cover}
        sizes="(min-width: 768px) 560px, 100vw"
        imageClassName="transition-transform duration-300 group-hover:scale-[1.03]"
      />
    </Link>
  );
}
