"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectCategory, ProjectDetail, ProjectMetric } from "@portfolio/shared";
import { adminApi, AdminApiError, errorMessage } from "@/lib/admin/api";
import { fromStored, toApiBlocks, validateBlocks, type EditorBlock } from "@/lib/admin/blocks";
import { formatDateTime, projectCategoryOptions, statusOptions, timeAgo } from "@/lib/admin/format";
import { useAdminQuery, useUnsavedChangesWarning } from "@/lib/admin/hooks";
import { primeMedia } from "@/lib/admin/media-cache";
import { buildPreview } from "@/lib/admin/preview";
import type { AdminProjectDetail, AdminTechnology, PublishStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProjectDetailView } from "@/components/views/ProjectDetailView";
import { useConfirm, useToast } from "../AdminProviders";
import { TechnologyPicker } from "../forms/TechnologyPicker";
import { MediaPicker } from "../media/MediaPicker";
import { Dialog } from "../ui/Dialog";
import { SelectField, Switch, TextAreaField, TextField } from "../ui/Field";
import { Card, ErrorState, LoadingBlock, PageHeader, Spinner, StatusBadge } from "../ui/Primitives";
import { TabPanel, Tabs, type TabItem } from "../ui/Tabs";
import { TagInput } from "../ui/TagInput";
import { BlocksEditor, MetricRows } from "./BlocksEditor";

/* ------------------------------------------------------------------ */
/* Form model                                                          */
/* ------------------------------------------------------------------ */
interface Values {
  title: string;
  slug: string;
  category: ProjectCategory;
  summary: string;
  impactLine: string;
  impactStatement: string;
  role: string;
  team: string;
  client: string;
  year: string;
  startedAt: string;
  endedAt: string;
  coverMediaId: string | null;
  contributions: string[];
  demoUrl: string;
  repoUrl: string;
  figmaUrl: string;
  dashboardUrl: string;
  notebookUrl: string;
  technologyIds: number[];
  metrics: ProjectMetric[];
  blocks: EditorBlock[];
  seoDescription: string;
  status: PublishStatus;
  isFeatured: boolean;
  publishedDate: string;
  sortOrder: number;
  meta: Record<string, unknown>;
}

const emptyValues = (): Values => ({
  title: "",
  slug: "",
  category: "web",
  summary: "",
  impactLine: "",
  impactStatement: "",
  role: "",
  team: "",
  client: "",
  year: String(new Date().getFullYear()),
  startedAt: "",
  endedAt: "",
  coverMediaId: null,
  contributions: [],
  demoUrl: "",
  repoUrl: "",
  figmaUrl: "",
  dashboardUrl: "",
  notebookUrl: "",
  technologyIds: [],
  metrics: [],
  blocks: [],
  seoDescription: "",
  status: "draft",
  isFeatured: false,
  publishedDate: "",
  sortOrder: 0,
  meta: {},
});

const fromDetail = (d: AdminProjectDetail): Values => ({
  title: d.title,
  slug: d.slug,
  category: d.category,
  summary: d.summary,
  impactLine: d.impactLine ?? "",
  impactStatement: d.impactStatement ?? "",
  role: d.role ?? "",
  team: d.team ?? "",
  client: d.client ?? "",
  year: d.year ? String(d.year) : "",
  startedAt: d.startedAt ?? "",
  endedAt: d.endedAt ?? "",
  coverMediaId: d.coverMediaId,
  contributions: d.contributions,
  demoUrl: d.demoUrl ?? "",
  repoUrl: d.repoUrl ?? "",
  figmaUrl: d.figmaUrl ?? "",
  dashboardUrl: d.dashboardUrl ?? "",
  notebookUrl: d.notebookUrl ?? "",
  technologyIds: d.technologyIds,
  metrics: d.metrics,
  blocks: fromStored(d.blocks),
  seoDescription: d.seoDescription ?? "",
  status: d.status,
  isFeatured: d.isFeatured,
  publishedDate: d.publishedAt ? d.publishedAt.slice(0, 10) : "",
  sortOrder: d.sortOrder,
  meta: d.meta ?? {},
});

type Part = "fields" | "metrics" | "blocks";
const partOf = (v: Values, part: Part) =>
  part === "metrics" ? JSON.stringify(v.metrics) : part === "blocks" ? JSON.stringify(v.blocks.map(({ key: _k, ...b }) => b)) : JSON.stringify({ ...v, metrics: null, blocks: null });

type Tab = "basics" | "links" | "tech" | "impact" | "case" | "seo" | "publish";
const tabFields: Record<Tab, string[]> = {
  basics: ["title", "slug", "category", "summary", "impactLine", "role", "team", "client", "year", "startedAt", "endedAt", "coverMediaId"],
  links: ["demoUrl", "repoUrl", "figmaUrl", "dashboardUrl", "notebookUrl"],
  tech: ["technologyIds"],
  impact: ["contributions", "impactStatement", "metrics"],
  case: ["blocks"],
  seo: ["seoDescription"],
  publish: ["status", "isFeatured", "publishedAt", "publishedDate", "sortOrder", "meta"],
};
const tabOfKey = (key: string): Tab => (Object.keys(tabFields) as Tab[]).find((t) => tabFields[t].includes(key.split(".")[0]!)) ?? "basics";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function clientErrors(v: Values): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.title.trim()) e.title = "Title is required.";
  if (!v.summary.trim()) e.summary = "Summary is required.";
  if (v.slug && !SLUG.test(v.slug)) e.slug = "Use lower-case letters, digits and hyphens.";
  if (v.year && (Number(v.year) < 1990 || Number(v.year) > 2100)) e.year = "Use a year between 1990 and 2100.";
  if (v.startedAt && v.endedAt && v.endedAt < v.startedAt) e.endedAt = "End date cannot be before the start date.";
  v.metrics.forEach((m, i) => {
    if (!m.value.trim()) e[`metrics.${i}.value`] = "Required.";
    if (!m.label.trim()) e[`metrics.${i}.label`] = "Required.";
  });
  return { ...e, ...validateBlocks(v.blocks) };
}

/* ------------------------------------------------------------------ */
/* Local autosave (rancangan §11: autosave draft every 10 s)           */
/* ------------------------------------------------------------------ */
interface LocalDraft {
  savedAt: number;
  values: Values;
}
const draftKey = (id: string | undefined) => `pf-admin:project:${id ?? "new"}`;
const readDraft = (id: string | undefined): LocalDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? (JSON.parse(raw) as LocalDraft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (id: string | undefined, values: Values) => {
  try {
    localStorage.setItem(draftKey(id), JSON.stringify({ savedAt: Date.now(), values }));
  } catch {
    /* storage full or blocked — autosave is best-effort */
  }
};
const clearDraft = (id: string | undefined) => {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {
    /* ignore */
  }
};

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */
export function ProjectEditor({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const isNew = !id;

  const detail = useAdminQuery<AdminProjectDetail>(id ? `/admin/projects/${id}` : null);
  const techs = useAdminQuery<AdminTechnology[]>("/admin/technologies", { limit: 200 });

  const [values, setValues] = useState<Values | null>(isNew ? emptyValues() : null);
  const [saved, setSaved] = useState<Values | null>(isNew ? emptyValues() : null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("basics");
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [restore, setRestore] = useState<LocalDraft | null>(null);
  const [preview, setPreview] = useState<ProjectDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load server data into the form (and offer a newer local draft, if any).
  useEffect(() => {
    if (!detail.data) return;
    primeMedia(detail.data.cover);
    const v = fromDetail(detail.data);
    setValues(v);
    setSaved(v);
    setUpdatedAt(detail.data.updatedAt);
    const draft = readDraft(id);
    if (draft && draft.savedAt > Date.parse(detail.data.updatedAt) && JSON.stringify(draft.values) !== JSON.stringify(v)) setRestore(draft);
  }, [detail.data, id]);

  useEffect(() => {
    if (!isNew) return;
    const draft = readDraft(undefined);
    if (draft) setRestore(draft);
  }, [isNew]);

  const dirtyParts = useMemo(() => {
    if (!values || !saved) return { fields: false, metrics: false, blocks: false };
    return {
      fields: partOf(values, "fields") !== partOf(saved, "fields"),
      metrics: partOf(values, "metrics") !== partOf(saved, "metrics"),
      blocks: partOf(values, "blocks") !== partOf(saved, "blocks"),
    };
  }, [values, saved]);
  const dirty = dirtyParts.fields || dirtyParts.metrics || dirtyParts.blocks;
  useUnsavedChangesWarning(dirty);

  // Autosave to this browser every 10 s while there are unsaved changes.
  useEffect(() => {
    if (!dirty || !values) return;
    const t = setInterval(() => writeDraft(id, values), 10_000);
    return () => clearInterval(t);
  }, [dirty, values, id]);

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((v) => (v ? { ...v, [key]: value } : v));
    setErrors((e) => {
      const k = String(key);
      const stale = Object.keys(e).filter((x) => x === k || x.startsWith(`${k}.`));
      if (!stale.length) return e;
      const next = { ...e };
      for (const x of stale) delete next[x];
      return next;
    });
  }, []);

  if (!isNew && detail.error) {
    return (
      <>
        <PageHeader title="Project" back={{ href: "/admin/projects", label: "All projects" }} />
        <ErrorState message={detail.error instanceof AdminApiError && detail.error.status === 404 ? "This project does not exist (or was deleted)." : errorMessage(detail.error)} onRetry={detail.reload} />
      </>
    );
  }
  if (!values || !saved) {
    return (
      <>
        <PageHeader title="Loading project…" back={{ href: "/admin/projects", label: "All projects" }} />
        <LoadingBlock rows={5} />
      </>
    );
  }

  const v = values;
  const err = (k: string) => errors[k];
  const initialPublished = saved.publishedDate;

  const body = (vals: Values) => ({
    title: vals.title.trim(),
    ...(vals.slug.trim() ? { slug: vals.slug.trim() } : {}),
    category: vals.category,
    summary: vals.summary.trim(),
    impactLine: vals.impactLine,
    impactStatement: vals.impactStatement,
    role: vals.role,
    team: vals.team,
    client: vals.client,
    year: vals.year ? Number(vals.year) : null,
    startedAt: vals.startedAt || null,
    endedAt: vals.endedAt || null,
    contributions: vals.contributions.map((c) => c.trim()).filter(Boolean),
    coverMediaId: vals.coverMediaId,
    demoUrl: vals.demoUrl,
    repoUrl: vals.repoUrl,
    figmaUrl: vals.figmaUrl,
    dashboardUrl: vals.dashboardUrl,
    notebookUrl: vals.notebookUrl,
    meta: vals.meta,
    status: vals.status,
    isFeatured: vals.isFeatured,
    sortOrder: vals.sortOrder,
    seoDescription: vals.seoDescription,
    // Only back-date when the date was changed here; otherwise the API keeps the original timestamp.
    publishedAt: vals.publishedDate && vals.publishedDate !== initialPublished ? `${vals.publishedDate}T00:00:00.000Z` : null,
    technologyIds: vals.technologyIds,
  });

  async function save(overrides: Partial<Values> = {}) {
    const vals = { ...v, ...overrides };
    const local = clientErrors(vals);
    if (Object.keys(local).length) {
      setErrors(local);
      setTab(tabOfKey(Object.keys(local)[0]!));
      toast.error("Some fields need attention.");
      return;
    }
    setSaving(true);
    setErrors({});
    let projectId = id ?? createdId;
    const parts = {
      fields: dirtyParts.fields || Object.keys(overrides).length > 0 || !projectId,
      metrics: dirtyParts.metrics || (!id && !createdId && vals.metrics.length > 0),
      blocks: dirtyParts.blocks || (!id && !createdId && vals.blocks.length > 0),
    };
    let stage: Part = "fields";
    try {
      if (parts.fields) {
        const res = projectId
          ? await adminApi.put<AdminProjectDetail>(`/admin/projects/${projectId}`, body(vals))
          : await adminApi.post<AdminProjectDetail>("/admin/projects", body(vals));
        projectId = res.data.id;
        setCreatedId(res.data.id);
      }
      stage = "metrics";
      if (parts.metrics) await adminApi.put(`/admin/projects/${projectId}/metrics`, { items: vals.metrics });
      stage = "blocks";
      if (parts.blocks) await adminApi.put(`/admin/projects/${projectId}/blocks`, { blocks: toApiBlocks(vals.blocks) });

      const fresh = (await adminApi.get<AdminProjectDetail>(`/admin/projects/${projectId}`)).data;
      const next = fromDetail(fresh);
      // Keep client keys of blocks so open editors don't remount.
      next.blocks = next.blocks.map((b, i) => ({ ...b, key: vals.blocks[i]?.key ?? b.key }));
      setValues(next);
      setSaved(next);
      setUpdatedAt(fresh.updatedAt);
      clearDraft(id);
      toast.success(isNew ? "Project created." : vals.status === "published" ? "Saved — the live site updates in a moment." : "Saved.");
      if (!id) router.replace(`/admin/projects/${projectId}`);
    } catch (e) {
      if (e instanceof AdminApiError && Object.keys(e.fields).length) {
        const mapped: Record<string, string> = {};
        for (const [k, msg] of Object.entries(e.fields)) {
          // metrics endpoint answers with "items.N.x"
          mapped[stage === "metrics" ? k.replace(/^items/, "metrics") : k] = msg;
        }
        setErrors(mapped);
        setTab(tabOfKey(Object.keys(mapped)[0]!));
      }
      toast.error(stage === "fields" || !projectId ? e : `Project saved, but the ${stage} could not be saved: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    const ok = await confirm({
      title: `Delete “${saved!.title}”?`,
      description: "The project disappears from the site and from this list.",
      confirmLabel: "Delete project",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.del(`/admin/projects/${id}`);
      clearDraft(id);
      toast.success("Project deleted.");
      router.push("/admin/projects");
    } catch (e) {
      toast.error(e);
    }
  }

  async function openPreview() {
    setPreviewLoading(true);
    try {
      const technologies = (techs.data ?? []).filter((t) => v.technologyIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name, slug: t.slug, group: t.group }));
      setPreview(await buildPreview({ ...v, id: id ?? "", technologies }));
    } finally {
      setPreviewLoading(false);
    }
  }

  const tabs: TabItem<Tab>[] = (
    [
      ["basics", "Basic info"],
      ["links", "Links"],
      ["tech", "Tech"],
      ["impact", "Contribution & metrics"],
      ["case", "Case study"],
      ["seo", "SEO"],
      ["publish", "Publish"],
    ] as Array<[Tab, string]>
  ).map(([value, label]) => ({
    value,
    label,
    alert: Object.keys(errors).some((k) => tabOfKey(k) === value),
    ...(value === "case" ? { count: v.blocks.length } : value === "tech" ? { count: v.technologyIds.length } : {}),
  }));

  const liveHref = saved.status === "published" && saved.slug ? `/projects/${saved.slug}` : null;

  return (
    <>
      <PageHeader
        title={isNew ? "New project" : saved.title || "Untitled project"}
        back={{ href: "/admin/projects", label: "All projects" }}
        description={
          isNew ? (
            "Start with the basics — you can save as a draft at any time."
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge status={saved.status} />
              {updatedAt && <span title={formatDateTime(updatedAt)}>Last saved {timeAgo(updatedAt)}</span>}
            </span>
          )
        }
        actions={
          <>
            {liveHref && (
              <Button href={liveHref} external variant="ghost" size="sm" icon="arrow-up-right">
                View live
              </Button>
            )}
            <Button variant="secondary" size="sm" iconLeft="eye" onClick={openPreview} disabled={previewLoading}>
              {previewLoading ? "Preparing…" : "Preview"}
            </Button>
            {v.status !== "published" && (
              <Button variant="secondary" size="sm" onClick={() => void save({ status: "published" })} disabled={saving}>
                Save & publish
              </Button>
            )}
          </>
        }
      />

      {restore && (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-[color-mix(in_srgb,var(--focus)_40%,transparent)] bg-[color-mix(in_srgb,var(--focus)_8%,transparent)] px-4 py-3 text-[13.5px]">
          <span className="flex items-center gap-2 text-text">
            <Icon name="clock" size={16} />
            Unsaved changes from {timeAgo(new Date(restore.savedAt).toISOString())} were found in this browser.
          </span>
          <span className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setValues(restore.values);
                setRestore(null);
              }}
            >
              Restore
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                clearDraft(id);
                setRestore(null);
              }}
            >
              Discard
            </Button>
          </span>
        </div>
      )}

      <Tabs items={tabs} value={tab} onChange={setTab} label="Project sections" idPrefix="project" className="mb-6" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
        className="pb-28"
      >
        <TabPanel idPrefix="project" value="basics" active={tab === "basics"}>
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Card title="Basic info" description="What the project card and the top of the case study show.">
              <TextField label="Title" required value={v.title} maxLength={160} onChange={(x) => set("title", x)} error={err("title")} />
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField label="Category" required value={v.category} options={projectCategoryOptions} onChange={(x) => set("category", x)} error={err("category")} hint="Decides the chip colour and the case-study template." />
                <TextField
                  label="URL slug"
                  value={v.slug}
                  maxLength={140}
                  placeholder={isNew ? "generated from the title" : ""}
                  onChange={(x) => set("slug", x.toLowerCase().replace(/\s+/g, "-"))}
                  error={err("slug")}
                  hint={`/projects/${v.slug || "…"}`}
                />
              </div>
              <TextAreaField label="Summary" required rows={3} maxLength={300} showCount value={v.summary} onChange={(x) => set("summary", x)} error={err("summary")} hint="1–2 sentences under the title." />
              <TextField label="Impact line" value={v.impactLine} maxLength={200} showCount onChange={(x) => set("impactLine", x)} error={err("impactLine")} hint="One sentence with a number, shown on the project card. e.g. “Cut reporting time from 2 days to 10 minutes.”" />
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField label="Role" value={v.role} maxLength={160} onChange={(x) => set("role", x)} error={err("role")} />
                <TextField label="Team" value={v.team} maxLength={160} onChange={(x) => set("team", x)} error={err("team")} />
                <TextField label="Client" value={v.client} maxLength={160} onChange={(x) => set("client", x)} error={err("client")} />
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <TextField label="Year" type="number" inputMode="numeric" min={1990} max={2100} value={v.year} onChange={(x) => set("year", x)} error={err("year")} />
                <TextField label="Started" type="date" value={v.startedAt} onChange={(x) => set("startedAt", x)} error={err("startedAt")} />
                <TextField label="Ended" type="date" value={v.endedAt} onChange={(x) => set("endedAt", x)} error={err("endedAt")} hint="Empty = ongoing" />
              </div>
            </Card>
            <Card title="Cover image" description="Thumbnail on cards and the big image on the case study.">
              <MediaPicker label="Cover" value={v.coverMediaId} onChange={(x) => set("coverMediaId", x)} error={err("coverMediaId")} hint="Landscape screenshot, at least 1600 × 1000 px." />
            </Card>
          </div>
        </TabPanel>

        <TabPanel idPrefix="project" value="links" active={tab === "links"}>
          <Card title="Links" description="Only filled links appear as buttons on the case study.">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField label="Live demo" type="url" placeholder="https://" value={v.demoUrl} onChange={(x) => set("demoUrl", x)} error={err("demoUrl")} />
              <TextField label="Repository" type="url" placeholder="https://github.com/…" value={v.repoUrl} onChange={(x) => set("repoUrl", x)} error={err("repoUrl")} />
              <TextField label="Figma" type="url" placeholder="https://www.figma.com/…" value={v.figmaUrl} onChange={(x) => set("figmaUrl", x)} error={err("figmaUrl")} hint="For UI/UX projects" />
              <TextField label="Dashboard" type="url" placeholder="https://" value={v.dashboardUrl} onChange={(x) => set("dashboardUrl", x)} error={err("dashboardUrl")} hint="Tableau, Looker Studio, Power BI" />
              <TextField label="Notebook" type="url" placeholder="https://" value={v.notebookUrl} onChange={(x) => set("notebookUrl", x)} error={err("notebookUrl")} hint="Kaggle, Colab or GitHub" />
            </div>
          </Card>
        </TabPanel>

        <TabPanel idPrefix="project" value="tech" active={tab === "tech"}>
          <Card title="Tech stack" description="Shown as tool chips on the case study.">
            <TechnologyPicker value={v.technologyIds} onChange={(x) => set("technologyIds", x)} error={err("technologyIds")} />
          </Card>
        </TabPanel>

        <TabPanel idPrefix="project" value="impact" active={tab === "impact"}>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="My contribution" description="What you personally did — one point per line.">
              <TagInput label="Contributions" name="contributions" errors={errors} values={v.contributions} onChange={(x) => set("contributions", x)} maxItems={20} maxLength={300} numbered placeholder="e.g. Designed the database schema with HR" />
            </Card>
            <Card title="Impact panel" description="The dark panel with big numbers.">
              <TextAreaField label="Impact statement" rows={3} maxLength={2000} value={v.impactStatement} onChange={(x) => set("impactStatement", x)} error={err("impactStatement")} />
              <div>
                <p className="mb-2 text-[13px] font-medium text-text">Metrics</p>
                <MetricRows items={v.metrics} onChange={(x) => set("metrics", x)} errors={errors} prefix="metrics" />
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel idPrefix="project" value="case" active={tab === "case"}>
          <BlocksEditor blocks={v.blocks} onChange={(x) => set("blocks", x)} category={v.category} errors={errors} />
        </TabPanel>

        <TabPanel idPrefix="project" value="seo" active={tab === "seo"}>
          <Card title="Search & sharing" description="Used for the page description in Google and link previews.">
            <TextAreaField label="Meta description" rows={3} maxLength={160} showCount value={v.seoDescription} onChange={(x) => set("seoDescription", x)} error={err("seoDescription")} hint="Empty = the summary is used." />
            <div className="rounded-md border border-border bg-bg p-4">
              <p className="text-label text-text-subtle">Google preview</p>
              <p className="mt-2 truncate text-[17px] text-[#1a0dab]">{v.title || "Project title"}</p>
              <p className="truncate text-[13px] text-success">/projects/{v.slug || "slug"}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-text-muted">{v.seoDescription || v.summary || "Description"}</p>
            </div>
          </Card>
        </TabPanel>

        <TabPanel idPrefix="project" value="publish" active={tab === "publish"}>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Visibility">
              <SelectField label="Status" value={v.status} options={statusOptions} onChange={(x) => set("status", x)} error={err("status")} />
              <Switch label="Featured" description="Featured projects appear first in “Selected projects” on the home page." checked={v.isFeatured} onChange={(x) => set("isFeatured", x)} />
              <TextField
                label="Publish date"
                type="date"
                value={v.publishedDate}
                onChange={(x) => set("publishedDate", x)}
                error={err("publishedAt")}
                hint="Used for “Newest/Oldest” sorting. Leave as is to keep the original date."
              />
            </Card>
            {!isNew && (
              <Card title="Danger zone">
                <p className="text-[13.5px] text-text-muted">Deleting removes the project from the site. Its images stay in the media library.</p>
                <Button variant="danger" size="sm" iconLeft="trash" onClick={remove} className="w-fit">
                  Delete project
                </Button>
              </Card>
            )}
          </div>
        </TabPanel>

        {/* Sticky save bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-md lg:left-[248px]">
          <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-3 px-4 py-3 md:px-8">
            <p className={cn("flex items-center gap-2 text-[13px]", dirty ? "text-text" : "text-text-subtle")} aria-live="polite">
              <span className={cn("size-2 rounded-full", dirty ? "bg-[#c49a3a]" : "bg-success")} aria-hidden="true" />
              {dirty ? "Unsaved changes (kept in this browser every 10 s)" : "All changes saved"}
            </p>
            <div className="flex gap-2">
              {dirty && !isNew && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (await confirm({ title: "Discard unsaved changes?", confirmLabel: "Discard", tone: "danger" })) {
                      setValues(saved);
                      setErrors({});
                      clearDraft(id);
                    }
                  }}
                >
                  Discard
                </Button>
              )}
              <Button type="submit" size="sm" disabled={saving || (!dirty && !isNew)} aria-busy={saving}>
                {saving ? (
                  <>
                    <Spinner size={13} label="Saving" /> Saving…
                  </>
                ) : isNew ? (
                  "Create project"
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <Dialog open={!!preview} onClose={() => setPreview(null)} title="Preview" description="How the case study will look with the current (unsaved) content." size="xl">
        {preview && (
          <div className="-mx-5 -my-4 overflow-hidden [&_article]:pt-0 [&_header.container-site]:pt-8">
            <ProjectDetailView project={preview} />
          </div>
        )}
      </Dialog>
    </>
  );
}
