"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

export interface TerminalData {
  name: string;
  roles: string[];
  location: string;
  email: string;
  cvUrl: string | null;
  projects: { title: string; slug: string; category: string }[];
}

interface Line {
  id: number;
  content: ReactNode;
}

const PROMPT = "guest@portfolio:~$";

/** Mini terminal easter egg for the 404 page (inspired by the "Portfolio OS" reference). */
export function Terminal({ data }: { data: TerminalData }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [value, setValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const print = (...content: ReactNode[]) =>
    setLines((l) => [...l, ...content.map((c) => ({ id: nextId.current++, content: c }))]);

  useEffect(() => {
    print(
      <span className="text-text-muted">Looks like this page doesn&apos;t exist. Try a command:</span>,
      <span className="text-text-muted">
        type <span className="text-text">help</span> to see what I can do.
      </span>,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines]);

  const commands: Record<string, { help: string; run: (args: string[]) => void }> = {
    help: {
      help: "list available commands",
      run: () =>
        print(
          ...Object.entries(commands).map(([name, c]) => (
            <span>
              <span className="inline-block w-24 text-text">{name}</span>
              <span className="text-text-muted">{c.help}</span>
            </span>
          )),
        ),
    },
    whoami: {
      help: "who built this site",
      run: () => print(<span className="text-text">{data.name}</span>, <span className="text-text-muted">{data.roles.join(" · ")} — based in {data.location}</span>),
    },
    projects: {
      help: "list projects",
      run: () =>
        print(
          ...data.projects.map((p) => (
            <span>
              <span className="inline-block w-14 text-text-subtle">[{p.category}]</span>{" "}
              <a href={`/projects/${p.slug}`} className="text-text underline-offset-4 hover:underline">
                {p.title}
              </a>
            </span>
          )),
        ),
    },
    resume: {
      help: "download my CV",
      run: () => {
        if (!data.cvUrl) return print(<span className="text-text-muted">CV not available yet.</span>);
        print(<span className="text-text-muted">Opening CV…</span>);
        window.open("/cv", "_blank", "noopener");
      },
    },
    contact: {
      help: "how to reach me",
      run: () =>
        print(
          <a href={`mailto:${data.email}`} className="text-text underline-offset-4 hover:underline">
            {data.email}
          </a>,
        ),
    },
    clear: { help: "clear the screen", run: () => setLines([]) },
    "cd ~": {
      help: "go back home",
      run: () => {
        print(<span className="text-text-muted">Taking you home…</span>);
        setTimeout(() => router.push("/"), 300);
      },
    },
  };

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input = value.trim();
    setValue("");
    setCursor(-1);
    print(
      <span>
        <span className="text-success">{PROMPT}</span> <span className="text-text">{input}</span>
      </span>,
    );
    if (!input) return;
    setHistory((h) => [input, ...h]);
    const normalised = input.toLowerCase().replace(/\s+/g, " ");
    const key = normalised === "cd" || normalised === "cd /" || normalised === "home" ? "cd ~" : normalised;
    const command = commands[key];
    if (command) command.run([]);
    else print(<span className="text-danger">command not found: {input}. Type “help”.</span>);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(cursor + 1, history.length - 1);
      if (next >= 0) {
        setCursor(next);
        setValue(history[next] ?? "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = cursor - 1;
      setCursor(Math.max(next, -1));
      setValue(next >= 0 ? (history[next] ?? "") : "");
    }
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-surface text-left shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-3 rounded-full bg-[#b5483b]" aria-hidden="true" />
        <span className="size-3 rounded-full bg-[#c49a3a]" aria-hidden="true" />
        <span className="size-3 rounded-full bg-[#3f7d58]" aria-hidden="true" />
        <span className="ml-3 font-mono text-[12px] text-text-subtle">guest@portfolio — zsh</span>
      </div>
      <div ref={bodyRef} className="h-[320px] overflow-y-auto p-4 font-mono text-[13px] leading-relaxed" role="log" aria-live="polite">
        {lines.map((line) => (
          <div key={line.id} className="break-words whitespace-pre-wrap">
            {line.content}
          </div>
        ))}
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <label htmlFor="terminal-input" className="shrink-0 text-success">
            {PROMPT}
          </label>
          <input
            ref={inputRef}
            id="terminal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Terminal command"
            className="min-w-0 flex-1 bg-transparent text-text caret-text outline-none focus-visible:outline-none"
          />
        </form>
      </div>
    </div>
  );
}
