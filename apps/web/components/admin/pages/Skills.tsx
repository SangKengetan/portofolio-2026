"use client";

import { useState } from "react";
import type { TechGroup } from "@portfolio/shared";
import { adminApi, AdminApiError, errorMessage } from "@/lib/admin/api";
import { techGroupOptions } from "@/lib/admin/format";
import { useAdminQuery } from "@/lib/admin/hooks";
import type { AdminTechnology } from "@/lib/admin/types";
import { Button } from "@/components/ui/Button";
import { Monogram } from "@/components/ui/Monogram";
import { useConfirm, useCounts, useToast } from "../AdminProviders";
import { Dialog } from "../ui/Dialog";
import { SelectField, Switch, TextField } from "../ui/Field";
import { Card, EmptyState, ErrorState, IconButton, LoadingBlock, PageHeader } from "../ui/Primitives";
import { SortableList } from "../ui/SortableList";

interface Draft {
  id?: number;
  name: string;
  slug: string;
  group: TechGroup;
  iconKey: string;
  showOnHome: boolean;
}

/** /admin/skills — technologies & tools, grouped like the Skills section on the site. */
export function SkillsManager() {
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh: refreshCounts } = useCounts();
  const list = useAdminQuery<AdminTechnology[]>("/admin/technologies", { limit: 200 });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const all = list.data ?? [];
  const byGroup = (g: TechGroup) => all.filter((t) => t.group === g);

  const open = (t?: AdminTechnology, group: TechGroup = "web") => {
    setErrors({});
    setDraft(t ? { id: t.id, name: t.name, slug: t.slug, group: t.group, iconKey: t.iconKey ?? "", showOnHome: t.showOnHome } : { name: "", slug: "", group, iconKey: "", showOnHome: true });
  };

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      setErrors({ name: "Name is required." });
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: draft.name.trim(),
        ...(draft.slug.trim() ? { slug: draft.slug.trim() } : {}),
        group: draft.group,
        iconKey: draft.iconKey,
        showOnHome: draft.showOnHome,
        sortOrder: draft.id ? (all.find((t) => t.id === draft.id)?.sortOrder ?? 0) : all.length,
      };
      if (draft.id) await adminApi.put(`/admin/technologies/${draft.id}`, body);
      else await adminApi.post("/admin/technologies", body);
      toast.success(draft.id ? "Skill updated." : "Skill added.");
      setDraft(null);
      void refreshCounts();
      await list.reload();
    } catch (err) {
      const handled = err instanceof AdminApiError && (err.code === "TECHNOLOGY_EXISTS" || Object.keys(err.fields).length > 0);
      if (err instanceof AdminApiError) setErrors(err.code === "TECHNOLOGY_EXISTS" ? { name: err.message } : err.fields);
      if (!handled) toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: AdminTechnology) {
    const ok = await confirm({
      title: `Delete “${t.name}”?`,
      description: "It is also removed from every project and experience that uses it.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.del(`/admin/technologies/${t.id}`);
      list.setData((items) => items?.filter((x) => x.id !== t.id) ?? null);
      toast.success("Skill deleted.");
      void refreshCounts();
    } catch (err) {
      toast.error(err);
    }
  }

  async function reorderGroup(group: TechGroup, items: AdminTechnology[]) {
    // Rebuild the global order: groups in display order, this group's items in the new order.
    const ordered = techGroupOptions.flatMap((g) => (g.value === group ? items : byGroup(g.value)));
    const previous = list.data;
    list.setData(ordered.map((t, i) => ({ ...t, sortOrder: i })));
    try {
      await adminApi.patch("/admin/technologies/reorder", { items: ordered.map((t, i) => ({ id: String(t.id), sortOrder: i })) });
      toast.success("Order saved.");
    } catch (err) {
      list.setData(previous);
      toast.error(err);
    }
  }

  return (
    <>
      <PageHeader
        title="Skills & tools"
        description="Shown in the Skills section and used to tag projects and experience."
        actions={
          <Button size="sm" iconLeft="plus" onClick={() => open()}>
            Add skill
          </Button>
        }
      />

      {list.error ? (
        <ErrorState message={errorMessage(list.error)} onRetry={list.reload} />
      ) : list.loading && !list.data ? (
        <LoadingBlock />
      ) : all.length === 0 ? (
        <EmptyState icon="layers" title="No skills yet" description="Add the languages, frameworks and tools you work with." action={<Button size="sm" iconLeft="plus" onClick={() => open()}>Add skill</Button>} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          {techGroupOptions.map((g) => {
            const items = byGroup(g.value);
            return (
              <Card
                key={g.value}
                title={g.label}
                description={`${items.length} item${items.length === 1 ? "" : "s"}`}
                actions={
                  <Button size="sm" variant="ghost" iconLeft="plus" onClick={() => open(undefined, g.value)}>
                    Add
                  </Button>
                }
              >
                {items.length === 0 ? (
                  <p className="text-[13px] text-text-subtle">Nothing in this group yet.</p>
                ) : (
                  <SortableList
                    items={items}
                    getKey={(t) => String(t.id)}
                    getLabel={(t) => t.name}
                    onReorder={(next) => void reorderGroup(g.value, next)}
                    className="-my-2 divide-y divide-border"
                    renderItem={(t) => (
                      <div className="flex items-center gap-3 py-2">
                        <Monogram name={t.name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] text-text">{t.name}</span>
                          {!t.showOnHome && <span className="block text-[12px] text-text-subtle">Hidden from the Skills section</span>}
                        </span>
                        <IconButton icon="pencil" label={`Edit ${t.name}`} onClick={() => open(t)} />
                        <IconButton icon="trash" label={`Delete ${t.name}`} tone="danger" onClick={() => void remove(t)} />
                      </div>
                    )}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit skill" : "Add skill"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : draft?.id ? "Save" : "Add skill"}
            </Button>
          </>
        }
      >
        {draft && (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
            className="flex flex-col gap-4"
          >
            <TextField label="Name" required autoFocus value={draft.name} maxLength={80} onChange={(x) => setDraft({ ...draft, name: x })} error={errors.name} placeholder="React, Figma, Python…" />
            <SelectField label="Group" value={draft.group} options={techGroupOptions} onChange={(x) => setDraft({ ...draft, group: x })} error={errors.group} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Slug" value={draft.slug} maxLength={80} placeholder="auto" onChange={(x) => setDraft({ ...draft, slug: x })} error={errors.slug} />
              <TextField label="Icon key" value={draft.iconKey} maxLength={80} placeholder="e.g. react" onChange={(x) => setDraft({ ...draft, iconKey: x })} error={errors.iconKey} hint="Simple Icons name (optional)." />
            </div>
            <Switch label="Show in the Skills section" checked={draft.showOnHome} onChange={(x) => setDraft({ ...draft, showOnHome: x })} />
            <button type="submit" hidden />
          </form>
        )}
      </Dialog>
    </>
  );
}
