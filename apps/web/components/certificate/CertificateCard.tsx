import type { Certificate } from "@portfolio/shared";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { Monogram } from "@/components/ui/Monogram";
import { SmartImage } from "@/components/ui/SmartImage";
import { cn, formatMonthYear } from "@/lib/utils";

interface CertificateCardProps {
  certificate: Certificate;
  onOpen: (certificate: Certificate) => void;
  /** "compact" hides the thumbnail (home page grid) */
  variant?: "full" | "compact";
}

export function CertificateCard({ certificate: c, onOpen, variant = "full" }: CertificateCardProps) {
  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-border bg-surface p-2 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-text-subtle/50 hover:shadow-card-hover">
      {variant === "full" && (
        <div className="relative aspect-[1.414/1] overflow-hidden rounded-md bg-surface-2">
          {c.image && (
            <SmartImage
              src={c.image.url}
              alt={c.image.alt}
              fill
              sizes="(min-width: 1280px) 300px, (min-width: 768px) 45vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
        </div>
      )}
      <div className={cn("flex flex-1 flex-col p-3", variant === "full" && "pt-4")}>
        <div className="flex items-start justify-between gap-3">
          {c.issuerLogo ? (
            <span className="relative size-8 overflow-hidden rounded-sm bg-surface-2">
              <SmartImage src={c.issuerLogo.url} alt={c.issuerLogo.alt} fill sizes="32px" className="object-contain p-1" />
            </span>
          ) : (
            <Monogram name={c.issuer} />
          )}
          {c.credentialUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--success)_12%,transparent)] px-2 py-0.5 text-[11px] font-medium text-success">
              <Icon name="badge-check" size={13} />
              Verified
            </span>
          )}
        </div>
        <h3 className="mt-3 text-[15px] leading-snug font-semibold text-text">
          <button
            type="button"
            onClick={() => onOpen(c)}
            className="text-left after:absolute after:inset-0 after:rounded-lg after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus"
          >
            {c.title}
          </button>
        </h3>
        <p className="mt-1 text-small text-text-muted">{c.issuer}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <Chip category={c.category} />
          <time dateTime={c.issuedAt} className="text-label text-text-subtle">
            {formatMonthYear(c.issuedAt)}
          </time>
        </div>
      </div>
    </article>
  );
}
