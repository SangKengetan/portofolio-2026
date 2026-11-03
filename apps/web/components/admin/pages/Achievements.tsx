"use client";

import type { AchievementLevel } from "@portfolio/shared";
import { labelOf, levelOptions } from "@/lib/admin/format";
import { useAdminQuery } from "@/lib/admin/hooks";
import { primeMedia } from "@/lib/admin/media-cache";
import type { AdminAchievement, AdminProjectListItem, PublishStatus } from "@/lib/admin/types";
import { yearOf } from "@/lib/utils";
import { ResourceEditor } from "../forms/ResourceEditor";
import { ResourceList } from "../forms/ResourceList";
import { MediaPicker } from "../media/MediaPicker";
import { SelectField, TextAreaField, TextField } from "../ui/Field";
import { Card } from "../ui/Primitives";

export function AchievementList() {
  return (
    <ResourceList<AdminAchievement>
      title="Achievements"
      singular="Achievement"
      description="Competition results, awards and scholarships for the timeline."
      endpoint="/admin/achievements"
      basePath="/admin/achievements"
      icon="trophy"
      itemLabel={(x) => x.title}
      renderMain={(x) => (
        <>
          <p className="truncate text-[14.5px] font-medium text-text">{x.title}</p>
          <p className="truncate text-[12.5px] text-text-subtle">
            {yearOf(x.achievedAt)} · {labelOf(levelOptions, x.level)}
            {x.organizer && ` · ${x.organizer}`}
          </p>
        </>
      )}
    />
  );
}

type Values = {
  title: string;
  organizer: string;
  level: AchievementLevel;
  rankLabel: string;
  achievedAt: string;
  description: string;
  linkUrl: string;
  imageMediaId: string | null;
  relatedProjectId: string;
  status: PublishStatus;
  sortOrder: number;
};

const empty: Values = {
  title: "",
  organizer: "",
  level: "national",
  rankLabel: "",
  achievedAt: "",
  description: "",
  linkUrl: "",
  imageMediaId: null,
  relatedProjectId: "",
  status: "published",
  sortOrder: 0,
};

export function AchievementEditor({ id }: { id?: string }) {
  const projects = useAdminQuery<AdminProjectListItem[]>("/admin/projects", { limit: 100 });
  return (
    <ResourceEditor<AdminAchievement, Values>
      id={id}
      endpoint="/admin/achievements"
      basePath="/admin/achievements"
      singular="Achievement"
      listLabel="All achievements"
      empty={empty}
      title={(v) => v.title}
      onLoaded={(d) => d.image && primeMedia(d.image)}
      fromDetail={(d) => ({
        title: d.title,
        organizer: d.organizer ?? "",
        level: d.level,
        rankLabel: d.rankLabel ?? "",
        achievedAt: d.achievedAt,
        description: d.description ?? "",
        linkUrl: d.linkUrl ?? "",
        imageMediaId: d.imageMediaId,
        relatedProjectId: d.relatedProjectId ?? "",
        status: d.status,
        sortOrder: d.sortOrder,
      })}
      validate={(v) => {
        const e: Record<string, string> = {};
        if (!v.title.trim()) e.title = "Title is required.";
        if (!v.achievedAt) e.achievedAt = "Date is required.";
        return e;
      }}
      toBody={(v) => ({ ...v, relatedProjectId: v.relatedProjectId || null })}
    >
      {({ values: v, set, errors: e }) => (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card title="Achievement">
            <TextField label="Title" required value={v.title} maxLength={200} placeholder="1st Place — UI/UX Design Competition" onChange={(x) => set("title", x)} error={e.title} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Rank" value={v.rankLabel} maxLength={60} placeholder="1st Place, Finalist, Best Paper…" onChange={(x) => set("rankLabel", x)} error={e.rankLabel} />
              <SelectField label="Level" value={v.level} options={levelOptions} onChange={(x) => set("level", x)} error={e.level} />
              <TextField label="Organizer" value={v.organizer} maxLength={160} onChange={(x) => set("organizer", x)} error={e.organizer} />
              <TextField label="Date" type="date" required value={v.achievedAt} onChange={(x) => set("achievedAt", x)} error={e.achievedAt} />
            </div>
            <TextAreaField label="Description" rows={3} maxLength={2000} value={v.description} onChange={(x) => set("description", x)} error={e.description} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Link" type="url" placeholder="https://" value={v.linkUrl} onChange={(x) => set("linkUrl", x)} error={e.linkUrl} hint="Announcement or certificate page." />
              <SelectField
                label="Related project"
                value={v.relatedProjectId}
                placeholder="None"
                options={(projects.data ?? []).map((p) => ({ value: p.id, label: p.title }))}
                onChange={(x) => set("relatedProjectId", x)}
                error={e.relatedProjectId}
              />
            </div>
          </Card>
          <Card title="Image">
            <MediaPicker label="Photo or certificate" value={v.imageMediaId} onChange={(x) => set("imageMediaId", x)} error={e.imageMediaId} />
          </Card>
        </div>
      )}
    </ResourceEditor>
  );
}
