import { Button } from "@/components/ui/Button";
import { Terminal, type TerminalData } from "@/components/terminal/Terminal";

export function NotFoundView({ data }: { data: TerminalData }) {
  return (
    <main id="top" data-theme="dark" className="flex min-h-dvh items-center bg-bg py-16">
      <div className="container-site grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="text-label text-text-subtle">Error 404</p>
          <h1 className="mt-4 text-display-xl text-text">
            Lost in the <span className="font-serif font-normal italic">void.</span>
          </h1>
          <p className="mt-6 max-w-[42ch] text-body-lg text-text-muted">
            The page you&apos;re looking for doesn&apos;t exist or has moved. Head home, or poke around the terminal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/" iconLeft="arrow-left" size="lg">
              Back home
            </Button>
            <Button href="/projects" variant="secondary" icon="arrow-right" size="lg">
              See projects
            </Button>
          </div>
        </div>
        <Terminal data={data} />
      </div>
    </main>
  );
}
