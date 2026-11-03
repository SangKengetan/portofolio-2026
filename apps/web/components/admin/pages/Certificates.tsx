"use client";

import type { CertificateCategory } from "@portfolio/shared";
import { certificateCategoryOptions } from "@/lib/admin/format";
import { primeMedia } from "@/lib/admin/media-cache";
import type { AdminCertificate, PublishStatus } from "@/lib/admin/types";
import { formatMonthYear } from "@/lib/utils";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { ResourceEditor } from "../forms/ResourceEditor";
import { ResourceList } from "../forms/ResourceList";
import { MediaPicker } from "../media/MediaPicker";
import { SelectField, Switch, TextField } from "../ui/Field";
import { Card } from "../ui/Primitives";

export function CertificateList() {
  return (
    <ResourceList<AdminCertificate>
      title="Certificates"
      singular="Certificate"
      description="Featured certificates appear on the home page; all published ones on /certificates."
      endpoint="/admin/certificates"
      basePath="/admin/certificates"
      icon="award"
      itemLabel={(x) => x.title}
      thumb={(x) => x.image?.url ?? null}
      renderMain={(x) => (
        <>
          <p className="flex items-center gap-1.5 truncate text-[14.5px] font-medium text-text">
            {x.isFeatured && <Icon name="star" size={13} className="shrink-0 fill-current text-[#c49a3a]" label="Featured" />}
            <span className="truncate">{x.title}</span>
          </p>
          <p className="truncate text-[12.5px] text-text-subtle">
            {x.issuer} · {formatMonthYear(x.issuedAt)}
            {x.credentialUrl && " · verified"}
          </p>
        </>
      )}
      renderAside={(x) => <Chip category={x.category} />}
    />
  );
}

type Values = {
  title: string;
  issuer: string;
  category: CertificateCategory;
  issuedAt: string;
  expiresAt: string;
  credentialId: string;
  credentialUrl: string;
  imageMediaId: string | null;
  issuerLogoMediaId: string | null;
  isFeatured: boolean;
  status: PublishStatus;
  sortOrder: number;
};

const empty: Values = {
  title: "",
  issuer: "",
  category: "web",
  issuedAt: "",
  expiresAt: "",
  credentialId: "",
  credentialUrl: "",
  imageMediaId: null,
  issuerLogoMediaId: null,
  isFeatured: false,
  status: "published",
  sortOrder: 0,
};

export function CertificateEditor({ id }: { id?: string }) {
  return (
    <ResourceEditor<AdminCertificate, Values>
      id={id}
      endpoint="/admin/certificates"
      basePath="/admin/certificates"
      singular="Certificate"
      listLabel="All certificates"
      empty={empty}
      title={(v) => v.title}
      onLoaded={(d) => {
        primeMedia(d.image);
        primeMedia(d.issuerLogo);
      }}
      fromDetail={(d) => ({
        title: d.title,
        issuer: d.issuer,
        category: d.category,
        issuedAt: d.issuedAt,
        expiresAt: d.expiresAt ?? "",
        credentialId: d.credentialId ?? "",
        credentialUrl: d.credentialUrl ?? "",
        imageMediaId: d.imageMediaId,
        issuerLogoMediaId: d.issuerLogoMediaId,
        isFeatured: d.isFeatured,
        status: d.status,
        sortOrder: d.sortOrder,
      })}
      validate={(v) => {
        const e: Record<string, string> = {};
        if (!v.title.trim()) e.title = "Title is required.";
        if (!v.issuer.trim()) e.issuer = "Issuer is required.";
        if (!v.issuedAt) e.issuedAt = "Issue date is required.";
        if (v.expiresAt && v.issuedAt && v.expiresAt < v.issuedAt) e.expiresAt = "Expiry date cannot be before the issue date.";
        return e;
      }}
      toBody={(v) => ({ ...v, expiresAt: v.expiresAt || null })}
    >
      {({ values: v, set, errors: e }) => (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card title="Certificate">
            <TextField label="Title" required value={v.title} maxLength={200} onChange={(x) => set("title", x)} error={e.title} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Issuer" required value={v.issuer} maxLength={160} placeholder="Dicoding, Google, Coursera…" onChange={(x) => set("issuer", x)} error={e.issuer} />
              <SelectField label="Category" value={v.category} options={certificateCategoryOptions} onChange={(x) => set("category", x)} error={e.category} />
              <TextField label="Issued" type="date" required value={v.issuedAt} onChange={(x) => set("issuedAt", x)} error={e.issuedAt} />
              <TextField label="Expires" type="date" value={v.expiresAt} onChange={(x) => set("expiresAt", x)} error={e.expiresAt} hint="Empty = does not expire" />
              <TextField label="Credential ID" value={v.credentialId} maxLength={160} onChange={(x) => set("credentialId", x)} error={e.credentialId} />
              <TextField label="Credential URL" type="url" placeholder="https://" value={v.credentialUrl} onChange={(x) => set("credentialUrl", x)} error={e.credentialUrl} hint="Filled = “Verified” badge on the site." />
            </div>
            <Switch label="Featured" description="Show among the four certificates on the home page." checked={v.isFeatured} onChange={(x) => set("isFeatured", x)} />
          </Card>
          <div className="flex flex-col gap-6">
            <Card title="Certificate image">
              <MediaPicker label="Image" aspect="aspect-[1.414/1]" value={v.imageMediaId} onChange={(x) => set("imageMediaId", x)} error={e.imageMediaId} hint="Shown in the preview modal." />
            </Card>
            <Card title="Issuer logo">
              <MediaPicker label="Logo" aspect="aspect-square" value={v.issuerLogoMediaId} onChange={(x) => set("issuerLogoMediaId", x)} error={e.issuerLogoMediaId} hint="Square. Empty = a monogram is shown." />
            </Card>
          </div>
        </div>
      )}
    </ResourceEditor>
  );
}
