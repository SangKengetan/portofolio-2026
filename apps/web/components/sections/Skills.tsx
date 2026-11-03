import type { TechGroup, Technology } from "@portfolio/shared";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Monogram } from "@/components/ui/Monogram";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";

const groups: Array<{ key: TechGroup; title: string; description: string; icon: IconName }> = [
  { key: "web", title: "Web development", description: "Front-end, back-end and databases for production web systems.", icon: "code" },
  { key: "uiux", title: "UI/UX design", description: "Research-led interfaces, from wireframe to tested prototype.", icon: "pen-tool" },
  { key: "data", title: "Data analysis", description: "Cleaning, exploring and visualising data to support decisions.", icon: "bar-chart" },
  { key: "tools", title: "Tools", description: "What keeps the work shipped, versioned and documented.", icon: "wrench" },
];

/** ⑤ Skills & tools — grouped per category. */
export function Skills({ technologies }: { technologies: Technology[] }) {
  return (
    <section id="skills" data-theme="light" aria-labelledby="skills-title" className="bg-bg pb-[var(--section-y)]">
      <div className="container-site">
        <SectionLabel>Toolbox</SectionLabel>
        <h2 id="skills-title" className="mt-2 text-h2 font-semibold tracking-[-0.03em] uppercase">
          Skills &amp; tools
        </h2>

        <div className="mt-10 border-b border-border">
          {groups.map((group, gi) => {
            const items = technologies.filter((t) => t.group === group.key);
            if (items.length === 0) return null;
            return (
              <Reveal key={group.key} delay={gi * 60}>
                <div className="grid gap-5 border-t border-border py-7 lg:grid-cols-[minmax(0,340px)_1fr] lg:gap-10">
                  <div className="flex gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface text-text">
                      <Icon name={group.icon} size={18} />
                    </span>
                    <div>
                      <h3 className="text-h3 text-text">{group.title}</h3>
                      <p className="mt-1 text-small text-text-muted">{group.description}</p>
                    </div>
                  </div>
                  <ul className="flex flex-wrap content-start gap-2">
                    {items.map((t) => (
                      <li
                        key={t.id}
                        className="inline-flex items-center gap-2.5 rounded-md border border-border bg-surface py-1.5 pr-3.5 pl-1.5 text-small font-medium text-text transition-colors duration-200 hover:border-text-subtle"
                      >
                        <Monogram name={t.name} />
                        {t.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
