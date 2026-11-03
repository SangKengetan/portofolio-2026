"use client";

import { useEffect, useRef, useState } from "react";
import type { BlockType, ProjectCategory } from "@portfolio/shared";
import { blockLabel, blockTypes, emptyBlock, newKey, templateBlocks, templates, type EditorBlock } from "@/lib/admin/blocks";
import { projectCategoryOptions } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useConfirm } from "../AdminProviders";
import { RichTextEditor } from "../forms/RichTextEditor";
import { MediaPicker } from "../media/MediaPicker";
import { SelectField, TextAreaField, TextField, controlClass } from "../ui/Field";
import { IconButton } from "../ui/Primitives";
import { SortableList } from "../ui/SortableList";
import { TagInput } from "../ui/TagInput";

type Errors = Record<string, string>;

/* ---------------- per-type editors ---------------- */

function BlockBody({ block, index, onChange, errors }: { block: EditorBlock; index: number; onChange: (b: EditorBlock) => void; errors: Errors }) {
  const p = `blocks.${index}.data`;
  const err = (k: string) => errors[`${p}.${k}`];

  switch (block.type) {
    case "rich_text":
      return <RichTextEditor label="Text" value={block.data.html} onChange={(html) => onChange({ ...block, data: { html } })} error={err("html")} />;

    case "image":
      return (
        <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
          <MediaPicker label="Image" required value={block.data.mediaId || null} onChange={(id) => onChange({ ...block, data: { ...block.data, mediaId: id ?? "" } })} error={err("mediaId")} />
          <div className="flex flex-col gap-4">
            <TextField label="Caption" value={block.data.caption ?? ""} maxLength={300} onChange={(caption) => onChange({ ...block, data: { ...block.data, caption } })} error={err("caption")} />
            <SelectField
              label="Frame"
              value={block.data.frame ?? "browser"}
              onChange={(frame) => onChange({ ...block, data: { ...block.data, frame } })}
              options={[
                { value: "browser", label: "Browser window" },
                { value: "device", label: "Device" },
                { value: "none", label: "No frame" },
              ]}
            />
          </div>
        </div>
      );

    case "gallery": {
      const items = block.data.items;
      const setItems = (next: typeof items) => onChange({ ...block, data: { ...block.data, items: next } });
      return (
        <div className="flex flex-col gap-4">
          <SelectField
            label="Columns"
            className="max-w-[200px]"
            value={String(block.data.columns ?? 2) as "2" | "3"}
            onChange={(v) => onChange({ ...block, data: { ...block.data, columns: v === "3" ? 3 : 2 } })}
            options={[
              { value: "2", label: "2 columns" },
              { value: "3", label: "3 columns" },
            ]}
          />
          {err("items") && <p className="text-[12.5px] text-danger">{err("items")}</p>}
          <ol className="grid gap-4 md:grid-cols-2">
            {items.map((it, j) => (
              <li key={j} className="flex flex-col gap-3 rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-text-subtle">Image {j + 1}</span>
                  <IconButton icon="x" label={`Remove image ${j + 1}`} tone="danger" onClick={() => setItems(items.filter((_, k) => k !== j))} />
                </div>
                <MediaPicker label="Image" value={it.mediaId || null} onChange={(id) => setItems(items.map((x, k) => (k === j ? { ...x, mediaId: id ?? "" } : x)))} error={err(`items.${j}.mediaId`)} />
                <TextField label="Caption" value={it.caption ?? ""} maxLength={300} onChange={(caption) => setItems(items.map((x, k) => (k === j ? { ...x, caption } : x)))} />
              </li>
            ))}
          </ol>
          <Button size="sm" variant="secondary" iconLeft="plus" disabled={items.length >= 24} onClick={() => setItems([...items, { mediaId: "", caption: "" }])} className="w-fit">
            Add image
          </Button>
        </div>
      );
    }

    case "before_after":
      return (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MediaPicker label="Before" required value={block.data.beforeMediaId || null} onChange={(id) => onChange({ ...block, data: { ...block.data, beforeMediaId: id ?? "" } })} error={err("beforeMediaId")} />
            <MediaPicker label="After" required value={block.data.afterMediaId || null} onChange={(id) => onChange({ ...block, data: { ...block.data, afterMediaId: id ?? "" } })} error={err("afterMediaId")} />
          </div>
          <TextField label="Caption" value={block.data.caption ?? ""} maxLength={300} onChange={(caption) => onChange({ ...block, data: { ...block.data, caption } })} />
        </div>
      );

    case "metrics": {
      const items = block.data.items;
      const setItems = (next: typeof items) => onChange({ ...block, data: { items: next } });
      return <MetricRows items={items} onChange={setItems} errors={errors} prefix={`${p}.items`} />;
    }

    case "quote":
      return (
        <div className="flex flex-col gap-4">
          <TextAreaField label="Quote" required rows={3} maxLength={1000} showCount value={block.data.text} onChange={(text) => onChange({ ...block, data: { ...block.data, text } })} error={err("text")} />
          <TextField label="Author" value={block.data.author ?? ""} maxLength={120} placeholder="e.g. Dinda, 21 — university student" onChange={(author) => onChange({ ...block, data: { ...block.data, author } })} />
        </div>
      );

    case "embed":
      return (
        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          <SelectField
            label="Provider"
            value={block.data.provider}
            onChange={(provider) => onChange({ ...block, data: { ...block.data, provider } })}
            options={[
              { value: "figma", label: "Figma" },
              { value: "tableau", label: "Tableau" },
              { value: "looker", label: "Looker Studio" },
              { value: "youtube", label: "YouTube" },
            ]}
          />
          <TextField label="URL" required type="url" placeholder="https://" value={block.data.url} onChange={(url) => onChange({ ...block, data: { ...block.data, url } })} error={err("url")} hint="Only https links from the chosen provider are accepted." />
          <TextField label="Title" className="md:col-span-2" value={block.data.title ?? ""} maxLength={120} onChange={(title) => onChange({ ...block, data: { ...block.data, title } })} hint="Shown on the “Load here” button." />
        </div>
      );

    case "code":
      return (
        <div className="flex flex-col gap-4">
          <TextField label="Language" className="max-w-[220px]" required value={block.data.language} maxLength={30} placeholder="sql, python, ts…" onChange={(language) => onChange({ ...block, data: { ...block.data, language } })} error={err("language")} />
          <TextAreaField
            label="Code"
            required
            rows={8}
            value={block.data.code}
            spellCheck={false}
            onChange={(code) => onChange({ ...block, data: { ...block.data, code } })}
            error={err("code")}
            className="[&_textarea]:font-mono [&_textarea]:text-[13px]"
          />
        </div>
      );

    case "list":
      return (
        <div className="flex flex-col gap-4">
          <SelectField
            label="Style"
            className="max-w-[220px]"
            value={block.data.style}
            onChange={(style) => onChange({ ...block, data: { ...block.data, style } })}
            options={[
              { value: "bullet", label: "Bulleted" },
              { value: "numbered", label: "Numbered" },
            ]}
          />
          <TagInput label="Items" name={`${p}.items`} errors={errors} values={block.data.items} maxItems={50} maxLength={300} numbered={block.data.style === "numbered"} onChange={(items) => onChange({ ...block, data: { ...block.data, items } })} />
        </div>
      );
  }
}

/** Value + label rows (used by the Metrics block and the project's impact metrics). */
export function MetricRows({
  items,
  onChange,
  errors,
  prefix,
  max = 8,
}: {
  items: Array<{ value: string; label: string }>;
  onChange: (items: Array<{ value: string; label: string }>) => void;
  errors: Errors;
  prefix: string;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      {errors[prefix] && <p className="text-[12.5px] text-danger">{errors[prefix]}</p>}
      <div className="hidden grid-cols-[140px_1fr_40px] gap-2 px-0.5 text-[12px] font-medium text-text-muted sm:grid">
        <span>Value</span>
        <span>Label</span>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((m, j) => {
          const ev = errors[`${prefix}.${j}.value`];
          const el = errors[`${prefix}.${j}.label`];
          return (
            <li key={j} className="grid grid-cols-[100px_1fr_40px] items-start gap-2 sm:grid-cols-[140px_1fr_40px]">
              <input
                aria-label={`Metric ${j + 1} value`}
                value={m.value}
                maxLength={20}
                placeholder="40%"
                onChange={(e) => onChange(items.map((x, k) => (k === j ? { ...x, value: e.target.value } : x)))}
                aria-invalid={!!ev}
                className={cn(controlClass(!!ev), "h-10 font-medium")}
              />
              <input
                aria-label={`Metric ${j + 1} label`}
                value={m.label}
                maxLength={80}
                placeholder="faster reporting"
                onChange={(e) => onChange(items.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)))}
                aria-invalid={!!el}
                className={cn(controlClass(!!el), "h-10")}
              />
              <IconButton icon="x" label={`Remove metric ${j + 1}`} tone="danger" onClick={() => onChange(items.filter((_, k) => k !== j))} />
              {(ev || el) && <p className="col-span-3 -mt-1 text-[12.5px] text-danger">{ev ? `Value: ${ev}` : ""} {el ? `Label: ${el}` : ""}</p>}
            </li>
          );
        })}
      </ol>
      <Button size="sm" variant="secondary" iconLeft="plus" className="w-fit" disabled={items.length >= max} onClick={() => onChange([...items, { value: "", label: "" }])}>
        Add metric
      </Button>
    </div>
  );
}

/* ---------------- add-block menu ---------------- */

function AddBlockMenu({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button size="sm" iconLeft="plus" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="true">
        Add block
      </Button>
      {open && (
        <ul className="absolute bottom-full left-0 z-20 mb-2 grid w-[min(520px,calc(100vw_-_48px))] gap-1 rounded-lg border border-border bg-surface p-2 shadow-[0_16px_40px_-16px_rgba(28,28,26,0.35)] sm:grid-cols-2">
          {blockTypes.map((t) => (
            <li key={t.type}>
              <button
                type="button"
                onClick={() => {
                  onAdd(t.type);
                  setOpen(false);
                }}
                className="flex w-full items-start gap-3 rounded-md p-2.5 text-left hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-border bg-bg text-text">
                  <Icon name={t.icon} size={15} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium text-text">{t.label}</span>
                  <span className="block text-[12px] text-text-muted">{t.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- editor ---------------- */

interface BlocksEditorProps {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  category: ProjectCategory;
  errors: Errors;
}

/** Case-study builder (rancangan §11): add blocks, drag to reorder, or start from the category template. */
export function BlocksEditor({ blocks, onChange, category, errors }: BlocksEditorProps) {
  const confirm = useConfirm();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const update = (key: string, b: EditorBlock) => onChange(blocks.map((x) => (x.key === key ? b : x)));
  const remove = async (key: string) => {
    if (await confirm({ title: "Remove this block?", description: "Its content is removed when you save.", confirmLabel: "Remove", tone: "danger" })) {
      onChange(blocks.filter((x) => x.key !== key));
    }
  };
  const duplicate = (b: EditorBlock) => {
    const i = blocks.findIndex((x) => x.key === b.key);
    const copy = { ...structuredClone(b), key: newKey(), id: "" } as EditorBlock;
    onChange([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
  };
  const toggle = (key: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const applyTemplate = async () => {
    const label = projectCategoryOptions.find((o) => o.value === category)?.label;
    if (blocks.length > 0) {
      const ok = await confirm({
        title: `Replace with the ${label} template?`,
        description: `The current ${blocks.length} block(s) are replaced by an empty outline: ${templates[category].map(([, h]) => h).join(", ")}.`,
        confirmLabel: "Replace blocks",
        tone: "danger",
      });
      if (!ok) return;
    }
    onChange(templateBlocks(category));
  };

  const blockHasError = (i: number) => Object.keys(errors).some((k) => k.startsWith(`blocks.${i}.`));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-bg px-4 py-3">
        <p className="text-[13px] text-text-muted">
          {blocks.length} block{blocks.length === 1 ? "" : "s"} · drag <Icon name="grip" size={13} className="inline align-[-2px]" /> or use the arrows to reorder.
        </p>
        <div className="flex gap-2">
          {blocks.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setCollapsed(collapsed.size === blocks.length ? new Set() : new Set(blocks.map((b) => b.key)))}>
              {collapsed.size === blocks.length ? "Expand all" : "Collapse all"}
            </Button>
          )}
          <Button size="sm" variant="secondary" iconLeft="layers" onClick={applyTemplate}>
            Use {projectCategoryOptions.find((o) => o.value === category)?.label} template
          </Button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-text">No case-study blocks yet</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-[13px] text-text-muted">
            Start from the template for this category ({templates[category].map(([, h]) => h).join(" → ")}) or add blocks one by one.
          </p>
        </div>
      ) : (
        <SortableList
          items={blocks}
          getKey={(b) => b.key}
          getLabel={(b) => `block ${blocks.indexOf(b) + 1} (${b.heading || blockLabel(b.type)})`}
          onReorder={onChange}
          className="gap-3"
          itemClassName="items-start rounded-lg"
          renderItem={(b, i) => {
            const isCollapsed = collapsed.has(b.key);
            return (
              <article className={cn("rounded-lg border bg-surface", blockHasError(i) ? "border-danger/60" : "border-border")}>
                <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:flex-nowrap">
                  <span className="font-mono text-[11px] text-text-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <span className="inline-flex h-6 shrink-0 items-center rounded-sm bg-surface-2 px-2 font-mono text-[10.5px] tracking-[0.04em] text-text-muted uppercase">{blockLabel(b.type)}</span>
                  <input
                    value={b.heading ?? ""}
                    onChange={(e) => update(b.key, { ...b, heading: e.target.value })}
                    maxLength={160}
                    placeholder="Section heading (optional)"
                    aria-label={`Block ${i + 1} heading`}
                    className="h-8 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-2 text-[14px] font-medium text-text placeholder:font-normal placeholder:text-text-subtle hover:border-border focus:border-text-muted focus-visible:outline-none"
                  />
                  {blockHasError(i) && <span className="size-2 shrink-0 rounded-full bg-danger" aria-label="This block has errors" />}
                  <span className="flex shrink-0 items-center">
                    <IconButton icon={isCollapsed ? "chevron-down" : "chevron-up"} label={isCollapsed ? `Expand block ${i + 1}` : `Collapse block ${i + 1}`} onClick={() => toggle(b.key)} />
                    <IconButton icon="copy" label={`Duplicate block ${i + 1}`} onClick={() => duplicate(b)} />
                    <IconButton icon="trash" label={`Remove block ${i + 1}`} tone="danger" onClick={() => void remove(b.key)} />
                  </span>
                </header>
                {!isCollapsed && (
                  <div className="p-4">
                    <BlockBody block={b} index={i} errors={errors} onChange={(nb) => update(b.key, nb)} />
                  </div>
                )}
              </article>
            );
          }}
        />
      )}

      <div>
        <AddBlockMenu onAdd={(type) => onChange([...blocks, emptyBlock(type)])} />
      </div>
    </div>
  );
}
