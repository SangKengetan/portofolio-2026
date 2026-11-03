import type { ProjectBlock } from "@portfolio/shared";
import { MediaFrame } from "@/components/ui/MediaFrame";
import { Reveal } from "@/components/ui/Reveal";
import { cn, pad2 } from "@/lib/utils";
import { EmbedFacade } from "./EmbedFacade";

function Caption({ children }: { children?: string }) {
  if (!children) return null;
  return <figcaption className="mt-3 text-small text-text-subtle">{children}</figcaption>;
}

function BlockBody({ block }: { block: ProjectBlock }) {
  switch (block.type) {
    case "rich_text":
      // HTML comes from Tiptap and is sanitised by the API (sanitize-html) before it is stored.
      return <div className="prose-case max-w-[68ch]" dangerouslySetInnerHTML={{ __html: block.data.html }} />;

    case "image":
      return (
        <figure>
          <MediaFrame media={block.data.media} frame={block.data.frame ?? "browser"} aspect="aspect-[16/10]" sizes="(min-width: 1280px) 900px, 100vw" />
          <Caption>{block.data.caption}</Caption>
        </figure>
      );

    case "gallery":
      return (
        <div className={cn("grid gap-6", block.data.columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
          {block.data.items.map((item) => (
            <figure key={item.media.id}>
              <MediaFrame media={item.media} sizes="(min-width: 1280px) 440px, (min-width: 768px) 50vw, 100vw" />
              <Caption>{item.caption}</Caption>
            </figure>
          ))}
        </div>
      );

    case "before_after":
      return (
        <figure>
          <div className="grid gap-4 md:grid-cols-2">
            {(["before", "after"] as const).map((key) => (
              <div key={key} className="relative">
                <MediaFrame media={block.data[key]} sizes="(min-width: 1280px) 440px, (min-width: 768px) 50vw, 100vw" />
                <span
                  className={cn(
                    "absolute top-10 left-4 rounded-full px-3 py-1 text-label",
                    key === "after" ? "bg-accent text-accent-fg" : "border border-border bg-surface text-text-muted",
                  )}
                >
                  {key}
                </span>
              </div>
            ))}
          </div>
          <Caption>{block.data.caption}</Caption>
        </figure>
      );

    case "metrics":
      return (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3">
          {block.data.items.map((m) => (
            <div key={m.label} className="flex flex-col-reverse gap-2 border-t border-border pt-4">
              <dt className="text-small text-text-muted">{m.label}</dt>
              <dd className="text-[clamp(36px,30px+1.6vw,56px)] leading-none font-light tracking-[-0.04em] text-text">{m.value}</dd>
            </div>
          ))}
        </dl>
      );

    case "quote":
      return (
        <figure className="border-l-2 border-text pl-6">
          <blockquote className="font-serif text-[clamp(26px,20px+1.6vw,40px)] leading-[1.2] text-text italic">
            “{block.data.text}”
          </blockquote>
          {block.data.author && <figcaption className="mt-4 text-small text-text-muted">— {block.data.author}</figcaption>}
        </figure>
      );

    case "embed":
      return <EmbedFacade data={block.data} />;

    case "code":
      return (
        <figure data-theme="dark" className="overflow-hidden rounded-lg bg-bg">
          <figcaption className="flex items-center justify-between border-b border-border px-4 py-2.5 text-label text-text-subtle">
            {block.data.language}
          </figcaption>
          <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-text">
            <code>{block.data.code}</code>
          </pre>
        </figure>
      );

    case "list": {
      const ListTag = block.data.style === "numbered" ? "ol" : "ul";
      return (
        <ListTag className="max-w-[68ch]">
          {block.data.items.map((item, i) => (
            <li key={i} className="flex gap-4 border-t border-border py-4 text-body-lg text-text-muted last:border-b">
              <span className="pt-1 font-mono text-[12px] text-text-subtle">{block.data.style === "numbered" ? pad2(i + 1) : "—"}</span>
              <span>{item}</span>
            </li>
          ))}
        </ListTag>
      );
    }
  }
}

/** Renders case-study blocks in order; heading column on the left on desktop. */
export function BlockRenderer({ blocks }: { blocks: ProjectBlock[] }) {
  return (
    <div className="flex flex-col">
      {blocks.map((block, i) => (
        <Reveal key={block.id} as="section" className="grid gap-6 border-t border-border py-12 md:py-16 lg:grid-cols-[260px_1fr] lg:gap-12">
          <header className="lg:sticky lg:top-[calc(var(--nav-h)_+_24px)] lg:self-start">
            <p className="font-mono text-[12px] text-text-subtle">{pad2(i + 1)}</p>
            {block.heading && <h2 className="mt-2 text-h3 text-text">{block.heading}</h2>}
          </header>
          <div className="min-w-0">
            <BlockBody block={block} />
          </div>
        </Reveal>
      ))}
    </div>
  );
}
