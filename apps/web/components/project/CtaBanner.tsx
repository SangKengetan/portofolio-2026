import { Button } from "@/components/ui/Button";

/** Dark closing banner on listing pages (section 5.2). */
export function CtaBanner({ title = "Let's build something useful." }: { title?: string }) {
  return (
    <aside data-theme="dark" className="flex flex-col items-start justify-between gap-6 rounded-xl bg-bg p-8 md:flex-row md:items-center md:p-12">
      <p className="max-w-[18ch] text-h1 text-text">
        {title}
      </p>
      <Button href="/#contact" icon="arrow-right" size="lg">
        Contact me
      </Button>
    </aside>
  );
}
