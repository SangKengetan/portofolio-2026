"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Lightweight rich-text editor for `rich_text` case-study blocks.
 * Produces only the tags the API keeps after sanitising (p, h3, strong, em, ul, ol, li, a, blockquote).
 * Swap for Tiptap later if you need tables, embeds or collaborative editing.
 */

const ALLOWED = new Set(["P", "H2", "H3", "H4", "STRONG", "EM", "U", "S", "UL", "OL", "LI", "A", "BLOCKQUOTE", "CODE", "PRE", "BR"]);
const RENAME: Record<string, string> = { B: "strong", I: "em", DIV: "p" };

/** Turns browser-generated markup (b/i/div/span/style) into the clean subset above. */
export function normalizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const root = document.createElement("div");
  root.innerHTML = html;
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      walk(child);
      let el: Element = child;
      const rename = RENAME[el.tagName];
      if (rename) {
        const replacement = document.createElement(rename);
        while (el.firstChild) replacement.appendChild(el.firstChild);
        el.replaceWith(replacement);
        el = replacement;
      }
      if (!ALLOWED.has(el.tagName)) {
        // Unwrap unknown elements (span, font, …), keeping their text.
        el.replaceWith(...el.childNodes);
        continue;
      }
      for (const attr of [...el.attributes]) {
        if (!(el.tagName === "A" && (attr.name === "href" || attr.name === "target"))) el.removeAttribute(attr.name);
      }
      if (el.tagName === "A") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    }
  };
  walk(root);
  // Wrap stray top-level text in paragraphs.
  for (const n of [...root.childNodes]) {
    if (n.nodeType === Node.TEXT_NODE && n.textContent?.trim()) {
      const p = document.createElement("p");
      n.replaceWith(p);
      p.appendChild(n);
    }
  }
  const out = root.innerHTML.replace(/<p><br><\/p>/g, "").trim();
  return out === "<br>" ? "" : out;
}

interface Tool {
  label: string;
  icon: IconName;
  run: () => void;
  active?: () => boolean;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  label: string;
  error?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, label, error, placeholder = "Write here…" }: RichTextEditorProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string>("");
  const savedRange = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [, force] = useState(0);

  // Only write into the DOM when the value changes from outside (not while typing).
  useEffect(() => {
    if (ref.current && value !== lastEmitted.current) {
      ref.current.innerHTML = value;
      lastEmitted.current = value;
    }
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = normalizeHtml(ref.current.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
    force((n) => n + 1);
  };

  const block = (tag: string) => {
    const current = document.queryCommandValue("formatBlock").toLowerCase();
    exec("formatBlock", current === tag ? "p" : tag);
  };

  const openLink = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && ref.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
    setLinkUrl("https://");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const sel = window.getSelection();
    if (savedRange.current && sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    if (/^(https?:|mailto:)/.test(linkUrl) && linkUrl.length > 8) exec("createLink", linkUrl);
    setLinkOpen(false);
  };

  const tools: Tool[] = [
    { label: "Bold", icon: "bold", run: () => exec("bold"), active: () => document.queryCommandState("bold") },
    { label: "Italic", icon: "italic", run: () => exec("italic"), active: () => document.queryCommandState("italic") },
    { label: "Heading", icon: "heading", run: () => block("h3") },
    { label: "Bulleted list", icon: "list", run: () => exec("insertUnorderedList"), active: () => document.queryCommandState("insertUnorderedList") },
    { label: "Numbered list", icon: "list-ordered", run: () => exec("insertOrderedList"), active: () => document.queryCommandState("insertOrderedList") },
    { label: "Quote", icon: "quote", run: () => block("blockquote") },
    { label: "Link", icon: "link", run: openLink },
  ];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openLink();
    }
  };

  const empty = !value || value === "<p></p>";

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-[13px] font-medium text-text">
        {label}
      </span>
      <div className={cn("overflow-hidden rounded-sm border bg-surface focus-within:border-text-muted", error ? "border-danger" : "border-border")}>
        <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap items-center gap-0.5 border-b border-border bg-bg px-1.5 py-1">
          {tools.map((t) => {
            let active = false;
            try {
              active = typeof document !== "undefined" && document.activeElement === ref.current && !!t.active?.();
            } catch {
              active = false;
            }
            return (
              <button
                key={t.label}
                type="button"
                title={t.label}
                aria-label={t.label}
                aria-pressed={t.active ? active : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.run}
                className={cn("grid size-8 place-items-center rounded-sm text-text-muted hover:bg-surface-2 hover:text-text", active && "bg-surface-2 text-text")}
              >
                <Icon name={t.icon} size={15} />
              </button>
            );
          })}
          {linkOpen && (
            <span className="ml-1 flex items-center gap-1">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyLink();
                  }
                  if (e.key === "Escape") setLinkOpen(false);
                }}
                aria-label="Link URL"
                className="h-7 w-56 rounded-sm border border-border bg-surface px-2 text-[12.5px]"
              />
              <button type="button" onClick={applyLink} className="h-7 rounded-sm bg-accent px-2.5 text-[12px] text-accent-fg">
                Add
              </button>
            </span>
          )}
        </div>
        <div className="relative">
          {empty && <span className="pointer-events-none absolute top-3 left-3.5 text-[14px] text-text-subtle">{placeholder}</span>}
          <div
            ref={ref}
            role="textbox"
            aria-multiline="true"
            aria-labelledby={`${id}-label`}
            aria-invalid={!!error}
            contentEditable
            suppressContentEditableWarning
            onInput={emit}
            onBlur={emit}
            onKeyUp={() => force((n) => n + 1)}
            onMouseUp={() => force((n) => n + 1)}
            onKeyDown={onKeyDown}
            className="prose-admin min-h-[160px] px-3.5 py-3 text-[14.5px] leading-relaxed text-text outline-none"
          />
        </div>
      </div>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
