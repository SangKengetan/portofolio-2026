import type { Profile } from "@portfolio/shared";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { parseEmphasis } from "@/lib/utils";

/** ② Statement — dark, large text with bold keywords. */
export function Statement({ profile }: { profile: Profile }) {
  return (
    <section id="about" data-theme="dark" aria-labelledby="about-title" className="bg-bg section-y">
      <div className="container-site flex flex-col items-center text-center">
        <SectionLabel>About</SectionLabel>
        <Reveal>
          <h2
            id="about-title"
            className="mt-6 max-w-[22ch] text-[clamp(30px,20px+2.8vw,56px)] leading-[1.12] font-light tracking-[-0.025em] text-text-muted"
          >
            {parseEmphasis(profile.statement).map((part, i) =>
              part.bold ? (
                <strong key={i} className="font-medium text-text">
                  {part.text}
                </strong>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </h2>
        </Reveal>
        <Reveal delay={200}>
          <SocialLinks socials={profile.socials} email={profile.email} variant="pill" className="mt-10 justify-center" />
        </Reveal>
      </div>
    </section>
  );
}
