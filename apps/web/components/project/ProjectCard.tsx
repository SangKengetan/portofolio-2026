import Link from "next/link";
import type { ProjectSummary } from "@portfolio/shared";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: ProjectSummary;
  /** "lg" for the 2-column home grid, "md" for the 3-column projects grid */
  size?: "md" | "lg";
  priority?: boolean;
  className?: string;
}

/**
 * Same card for Web, UI/UX and Data projects (section 1: "one system, three project types").
 * The whole card is clickable via the stretched title link.
 */
export function ProjectCard({ project, size = "lg", priority, className }: ProjectCardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-xl p-2 transition-[transform,background-color,box-shadow] duration-300 ease-out",
        "hover:-translate-y-1 hover:bg-surface hover:shadow-card-hover focus-within:bg-surface",
        className,
      )}
    >
      <div className="relative">
        <MediaFrame
          media={project.cover}
          priority={priority}
          sizes={size === "lg" ? "(min-width: 1280px) 620px, (min-width: 768px) 50vw, 100vw" : "(min-width: 1280px) 410px, (min-width: 768px) 50vw, 100vw"}
          imageClassName="transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        <span
          aria-hidden="true"
          className="absolute right-4 bottom-4 grid size-10 place-items-center rounded-full bg-accent text-accent-fg opacity-90 transition-transform duration-300 group-hover:-rotate-45"
        >
          <Icon name="arrow-right" size={16} />
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-5 pb-3">
        <div className="flex items-center gap-2 text-label text-text-subtle">
          <Chip category={project.category} />
          {project.year && <span>· {project.year}</span>}
        </div>
        <h3 className={cn("mt-3 text-text", size === "lg" ? "text-h3" : "text-[19px] leading-snug font-semibold tracking-[-0.01em]")}>
          <Link
            href={`/projects/${project.slug}`}
            className="rounded-sm after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
          >
            {project.title}
          </Link>
        </h3>
        <p className="mt-2 text-small text-text-muted">{project.impactLine ?? project.summary}</p>
      </div>
    </article>
  );
}
