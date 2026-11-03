import Link from "next/link";
import type { ProjectDetail } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { Reveal } from "@/components/ui/Reveal";
import { BlockRenderer } from "@/components/project/BlockRenderer";
import { ImpactPanel } from "@/components/project/ImpactPanel";
import { NextProject } from "@/components/project/NextProject";
import { formatMonthYear, pad2 } from "@/lib/utils";

function timeline(p: ProjectDetail) {
  if (!p.startedAt) return p.year ? String(p.year) : null;
  return `${formatMonthYear(p.startedAt)} — ${p.endedAt ? formatMonthYear(p.endedAt) : "Present"}`;
}

/** /projects/[slug] — case study (section 5.3). Blocks follow the category template. */
export function ProjectDetailView({ project: p }: { project: ProjectDetail }) {
  const links = [
    { href: p.demoUrl, label: "Live demo" },
    { href: p.repoUrl, label: "GitHub" },
    { href: p.figmaUrl, label: "Figma" },
    { href: p.dashboardUrl, label: "Dashboard" },
    { href: p.notebookUrl, label: "Notebook" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href));

  const meta = [
    { label: "Role", value: p.role },
    { label: "Timeline", value: timeline(p) },
    { label: "Team", value: p.team },
    { label: "Client", value: p.client },
  ].filter((m): m is { label: string; value: string } => Boolean(m.value));

  return (
    <article data-theme="light" className="bg-bg">
      <header className="container-site pt-[calc(var(--nav-h)_+_32px)] md:pt-[calc(var(--nav-h)_+_56px)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/projects"
            className="group inline-flex items-center gap-2 rounded-full text-small text-text-muted transition-colors hover:text-text"
          >
            <Icon name="arrow-left" size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Back to projects
          </Link>
          <div className="flex items-center gap-2 text-label text-text-subtle">
            <Chip category={p.category} />
            {p.year && <span>· {p.year}</span>}
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-16">
          <div>
            <h1 className="text-h1 text-text md:text-[clamp(44px,28px+3vw,72px)]">{p.title}</h1>
            <p className="mt-6 max-w-[60ch] text-body-lg text-text-muted">{p.summary}</p>
            {links.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {links.map((l, i) => (
                  <Button key={l.label} href={l.href} external variant={i === 0 ? "primary" : "secondary"} icon="arrow-up-right">
                    {l.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 self-end border-t border-border pt-6 lg:grid-cols-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            {meta.map((m) => (
              <div key={m.label}>
                <dt className="text-label text-text-subtle">{m.label}</dt>
                <dd className="mt-1 text-small text-text">{m.value}</dd>
              </div>
            ))}
            {p.technologies.length > 0 && (
              <div className="col-span-2 lg:col-span-1">
                <dt className="text-label text-text-subtle">Tools</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {p.technologies.map((t) => (
                    <Chip key={t.id} label={t.name} />
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <Reveal className="mt-12 md:mt-16">
          <MediaFrame media={p.cover} priority aspect="aspect-[16/9]" className="rounded-xl p-2" sizes="(min-width: 1280px) 1280px, 100vw" />
        </Reveal>
      </header>

      {(p.contributions.length > 0 || p.metrics.length > 0) && (
        <section aria-labelledby="impact-title" className="container-site section-y">
          <h2 id="impact-title" className="text-h2 text-text">
            Contribution &amp; impact
          </h2>
          <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <h3 className="text-label text-text-subtle">My contribution</h3>
              <ol className="mt-4">
                {p.contributions.map((c, i) => (
                  <li key={c} className="flex gap-4 border-t border-border py-4 text-body text-text">
                    <span className="pt-0.5 font-mono text-[12px] text-text-subtle">{pad2(i + 1)}</span>
                    {c}
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={100}>
              <ImpactPanel statement={p.impactStatement} metrics={p.metrics} className="h-full" />
            </Reveal>
          </div>
        </section>
      )}

      {p.blocks.length > 0 && (
        <div className="container-site">
          <BlockRenderer blocks={p.blocks} />
        </div>
      )}

      {p.nextProject && (
        <nav aria-label="Next project" className="container-site pt-12 pb-[var(--section-y)]">
          <NextProject project={p.nextProject} />
        </nav>
      )}
    </article>
  );
}
