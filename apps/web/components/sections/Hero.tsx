import type { CSSProperties } from "react";
import type { Profile, Stats } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/SmartImage";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { StatBadge } from "@/components/ui/StatBadge";
import { TypingText } from "@/components/ui/TypingText";

const STAGGER = 60;

function Words({ text, start, className }: { text: string; start: number; className?: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} className={className}>
          <span className="word-in" style={{ animationDelay: `${(start + i) * STAGGER}ms` } as CSSProperties}>
            {word}
          </span>{" "}
        </span>
      ))}
    </>
  );
}

/** ① Hero — light section with a rounded bottom edge over the dark Statement. */
export function Hero({ profile, stats }: { profile: Profile; stats: Stats }) {
  const greeting = "Hi, I'm";
  const greetingWords = greeting.split(" ").length;

  return (
    <div data-theme="dark" className="bg-bg">
      <section
        id="home"
        data-theme="light"
        aria-labelledby="hero-title"
        className="relative overflow-hidden rounded-b-[36px] bg-bg pt-[calc(var(--nav-h)_+_24px)] pb-16 md:rounded-b-[56px] md:pt-[calc(var(--nav-h)_+_48px)] md:pb-24"
      >
        <div className="container-site grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          {/* Text */}
          <div className="order-2 lg:order-1">
            <SocialLinks socials={profile.socials} email={profile.email} className="-ml-2" />
            <p className="mt-6 text-label text-text-subtle">Web Dev · UI/UX · Data</p>

            <h1 id="hero-title" className="mt-4 text-display-xl text-text">
              <Words text={greeting} start={0} />
              <span className="font-serif font-normal tracking-[-0.01em] italic">
                <Words text={`${profile.shortName}.`} start={greetingWords} />
              </span>
            </h1>

            <p className="mt-5 min-h-[1.3em] text-[clamp(24px,20px+1.2vw,36px)] leading-tight font-light tracking-[-0.01em] text-text-muted">
              <TypingText words={profile.roles} />
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/#projects" icon="arrow-right" size="lg">
                View projects
              </Button>
              {profile.cvUrl && (
                <Button href="/cv" variant="secondary" icon="download" size="lg">
                  Download CV
                </Button>
              )}
            </div>

            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Highlights">
              <StatBadge icon="code" value={stats.projects.web} label="web projects" />
              <StatBadge icon="pen-tool" value={stats.projects.uiux} label="UI/UX case studies" />
              <StatBadge icon="bar-chart" value={stats.projects.data} label="data analyses" />
            </ul>
          </div>

          {/* Photo card */}
          <div className="order-1 mx-auto w-full max-w-[300px] sm:max-w-[380px] lg:order-2 lg:max-w-[440px] lg:justify-self-end">
            <figure
              data-theme="dark"
              className="group relative aspect-[4/4.6] overflow-hidden rounded-xl bg-surface shadow-[0_24px_60px_-24px_rgba(28,28,26,0.45)]"
            >
              <span aria-hidden="true" className="absolute top-6 left-6 font-mono text-3xl text-text-subtle/40">
                &lt;/&gt;
              </span>
              <span aria-hidden="true" className="absolute top-6 right-6 font-mono text-3xl text-text-subtle/40">
                {"{ }"}
              </span>
              {profile.photo && (
                <SmartImage
                  src={profile.photo.url}
                  alt={profile.photo.alt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 440px, 90vw"
                  className="photo-mono object-cover object-top"
                />
              )}
              <figcaption className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-lg border border-border/60 bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] px-4 py-3 backdrop-blur-md">
                <span>
                  <span className="block text-small font-semibold text-text">{profile.handle}</span>
                  <span className="block text-[13px] text-text-muted">
                    {profile.availableForWork ? "Available for work" : "Currently busy"}
                  </span>
                </span>
                <span className="relative flex size-2.5" aria-hidden="true">
                  {profile.availableForWork && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                  )}
                  <span className={profile.availableForWork ? "relative size-2.5 rounded-full bg-success" : "relative size-2.5 rounded-full bg-text-subtle"} />
                </span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
    </div>
  );
}
