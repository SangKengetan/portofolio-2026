"use client";

import { useState } from "react";
import type { EmbedBlock } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

const providerLabel: Record<EmbedBlock["data"]["provider"], string> = {
  figma: "Figma prototype",
  tableau: "Tableau dashboard",
  looker: "Looker Studio report",
  youtube: "YouTube video",
};

function toEmbedUrl({ provider, url }: EmbedBlock["data"]) {
  if (provider === "figma") return `https://www.figma.com/embed?embed_host=portfolio&url=${encodeURIComponent(url)}`;
  if (provider === "youtube") {
    const id = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];
    return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
  }
  if (provider === "tableau") return url.includes("?") ? `${url}&:embed=y` : `${url}?:embed=y`;
  return url;
}

/**
 * Click-to-load embed: heavy third-party iframes (Figma, Tableau, Looker, YouTube)
 * load only when the visitor asks, keeping the case-study page fast.
 */
export function EmbedFacade({ data }: { data: EmbedBlock["data"] }) {
  const [loaded, setLoaded] = useState(false);
  const title = data.title ?? providerLabel[data.provider];

  return (
    <div className="overflow-hidden rounded-lg bg-surface-2 p-1.5">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[12px] bg-surface">
        {loaded ? (
          <iframe
            src={toEmbedUrl(data)}
            title={title}
            className="absolute inset-0 size-full border-0"
            allow="fullscreen; clipboard-write"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-border text-text">
              <Icon name={data.provider === "figma" ? "figma" : data.provider === "youtube" ? "arrow-right" : "bar-chart"} size={20} />
            </span>
            <div>
              <p className="text-h3 text-text">{title}</p>
              <p className="mt-1 text-small text-text-muted">Interactive {providerLabel[data.provider].toLowerCase()} — loads from a third-party site.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setLoaded(true)} icon="maximize">
                Load here
              </Button>
              <Button href={data.url} external variant="secondary" icon="arrow-up-right">
                Open in new tab
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
