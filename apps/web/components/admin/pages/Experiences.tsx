"use client";

import { employmentOptions, labelOf } from "@/lib/admin/format";
import { primeMedia } from "@/lib/admin/media-cache";
import type { AdminExperience, PublishStatus } from "@/lib/admin/types";
import { formatPeriod } from "@/lib/utils";
import type { EmploymentType } from "@portfolio/shared";
import { TechnologyPicker } from "../forms/TechnologyPicker";
import { ResourceEditor } from "../forms/ResourceEditor";
import { ResourceList } from "../forms/ResourceList";
import { MediaPicker } from "../media/MediaPicker";
import { SelectField, TextAreaField, TextField } from "../ui/Field";
import { Card } from "../ui/Primitives";
import { TagInput } from "../ui/TagInput";

export function ExperienceList() {
  return (
    <ResourceList<AdminExperience>
      title="Experience"
      singular="Experience"
      description="Cards in the horizontal “Experiences” section. Drag to set the order."
      endpoint="/admin/experiences"
      basePath="/admin/experiences"
      icon="briefcase"
      itemLabel={(x) => `${x.role} at ${x.company}`}
      thumb={(x) => x.image?.url ?? null}
      renderMain={(x) => (
        <>
          <p className="truncate text-[14.5px] font-medium text-text">{x.role}</p>
          <p className="truncate text-[12.5px] text-text-subtle">
            {x.company} · {labelOf(employmentOptions, x.employmentType)}
          </p>
        </>
      )}
      renderAside={(x) => <span className="font-mono text-[11px] text-text-subtle uppercase">{formatPeriod(x.startDate, x.endDate)}</span>}
    />
  );
}

type Values = {
  role: string;
  company: string;
  companyUrl: string;
  location: string;
  employmentType: EmploymentType;
  startDate: string;
  endDate: string;
  description: string;
  highlights: string[];
  imageMediaId: string | null;
  technologyIds: number[];
  status: PublishStatus;
  sortOrder: number;
};

const empty: Values = {
  role: "",
  company: "",
  companyUrl: "",
  location: "",
  employmentType: "internship",
  startDate: "",
  endDate: "",
  description: "",
  highlights: [],
  imageMediaId: null,
  technologyIds: [],
  status: "published",
  sortOrder: 0,
};

export function ExperienceEditor({ id }: { id?: string }) {
  return (
    <ResourceEditor<AdminExperience, Values>
      id={id}
      endpoint="/admin/experiences"
      basePath="/admin/experiences"
      singular="Experience"
      listLabel="All experience"
      empty={empty}
      title={(v) => (v.role ? `${v.role}${v.company ? ` · ${v.company}` : ""}` : "")}
      onLoaded={(d) => primeMedia(d.image)}
      fromDetail={(d) => ({
        role: d.role,
        company: d.company,
        companyUrl: d.companyUrl ?? "",
        location: d.location ?? "",
        employmentType: d.employmentType,
        startDate: d.startDate,
        endDate: d.endDate ?? "",
        description: d.description ?? "",
        highlights: d.highlights,
        imageMediaId: d.imageMediaId,
        technologyIds: d.technologyIds,
        status: d.status,
        sortOrder: d.sortOrder,
      })}
      validate={(v) => {
        const e: Record<string, string> = {};
        if (!v.role.trim()) e.role = "Role is required.";
        if (!v.company.trim()) e.company = "Company is required.";
        if (!v.startDate) e.startDate = "Start date is required.";
        if (v.endDate && v.startDate && v.endDate < v.startDate) e.endDate = "End date cannot be before the start date.";
        return e;
      }}
      toBody={(v) => ({
        ...v,
        endDate: v.endDate || null,
        highlights: v.highlights.map((h) => h.trim()).filter(Boolean),
      })}
    >
      {({ values: v, set, errors: e }) => (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Card title="Role">
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Role" required value={v.role} maxLength={160} onChange={(x) => set("role", x)} error={e.role} placeholder="Backend Developer" />
                <SelectField label="Type" value={v.employmentType} options={employmentOptions} onChange={(x) => set("employmentType", x)} error={e.employmentType} />
                <TextField label="Company / organisation" required value={v.company} maxLength={160} onChange={(x) => set("company", x)} error={e.company} />
                <TextField label="Company website" type="url" placeholder="https://" value={v.companyUrl} onChange={(x) => set("companyUrl", x)} error={e.companyUrl} />
                <TextField label="Location" value={v.location} maxLength={120} placeholder="Remote, On-site, Hybrid…" onChange={(x) => set("location", x)} error={e.location} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label="Start date" type="date" required value={v.startDate} onChange={(x) => set("startDate", x)} error={e.startDate} />
                <TextField label="End date" type="date" value={v.endDate} onChange={(x) => set("endDate", x)} error={e.endDate} hint="Empty = present" />
              </div>
              <TextAreaField label="Description" rows={4} maxLength={3000} value={v.description} onChange={(x) => set("description", x)} error={e.description} />
            </Card>
            <Card title="Photo">
              <MediaPicker label="Image" aspect="aspect-square" value={v.imageMediaId} onChange={(x) => set("imageMediaId", x)} error={e.imageMediaId} hint="Square photo of the team, office or work. Shown in grayscale." />
            </Card>
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Highlights" description="Up to 4 fit best on the card.">
              <TagInput label="Highlights" name="highlights" errors={e} values={v.highlights} onChange={(x) => set("highlights", x)} maxItems={10} maxLength={200} numbered placeholder="e.g. RESTful API development" />
            </Card>
            <Card title="Tech">
              <TechnologyPicker value={v.technologyIds} onChange={(x) => set("technologyIds", x)} error={e.technologyIds} />
            </Card>
          </div>
        </>
      )}
    </ResourceEditor>
  );
}
