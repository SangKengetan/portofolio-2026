import type { Profile } from "@portfolio/shared";
import { GhostHeading } from "@/components/ui/GhostHeading";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SocialLinks } from "@/components/ui/SocialLinks";
import { ContactForm } from "./ContactForm";

/** ⑦ Contact CTA — "Let's work together." + short form (dark). */
export function ContactCta({ profile }: { profile: Profile }) {
  return (
    <section id="contact" data-theme="dark" aria-labelledby="contact-title" className="relative overflow-x-clip bg-bg section-y">
      <div className="container-site relative">
        <GhostHeading text="Contact" className="top-[8%]" />
        <div className="relative flex flex-col items-center text-center">
          <SectionLabel>{profile.availableForWork ? "Open to work · Freelance & full-time" : "Get in touch"}</SectionLabel>
          <Reveal>
            <h2 id="contact-title" className="mt-6 text-display-xl font-semibold text-text uppercase">
              Let&apos;s work
              <br />
              together<span className="font-serif font-normal normal-case italic">.</span>
            </h2>
          </Reveal>
        </div>

        <div className="relative mt-14 grid gap-10 md:mt-20 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <Reveal>
            <div className="flex flex-col gap-6">
              <a
                href={`mailto:${profile.email}`}
                className="group inline-flex w-fit items-center gap-3 text-[clamp(22px,18px+1.2vw,32px)] font-medium tracking-[-0.02em] text-text"
              >
                <span className="border-b border-border pb-1 transition-colors group-hover:border-text">{profile.email}</span>
                <Icon name="arrow-up-right" size={24} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
              </a>
              <p className="max-w-[40ch] text-body text-text-muted">
                Have a project, a role, or a dataset that needs a second pair of eyes? Send a message — I read every one.
              </p>
              <SocialLinks socials={profile.socials} variant="pill" />
            </div>
          </Reveal>
          <Reveal delay={100}>
            <ContactForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
