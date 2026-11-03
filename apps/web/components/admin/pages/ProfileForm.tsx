"use client";

import { useEffect, useState } from "react";
import type { Socials } from "@portfolio/shared";
import { adminApi, AdminApiError, errorMessage } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import { useAdminQuery, useFormState, useUnsavedChangesWarning } from "@/lib/admin/hooks";
import { primeMedia } from "@/lib/admin/media-cache";
import type { AdminProfile } from "@/lib/admin/types";
import { useToast } from "../AdminProviders";
import { MediaPicker } from "../media/MediaPicker";
import { Switch, TextAreaField, TextField } from "../ui/Field";
import { Card, ErrorState, LoadingBlock, PageHeader } from "../ui/Primitives";
import { SaveBar } from "../ui/SaveBar";
import { TagInput } from "../ui/TagInput";

type Values = {
  fullName: string;
  shortName: string;
  roles: string[];
  headline: string;
  statement: string;
  bio: string;
  location: string;
  timezone: string;
  email: string;
  phone: string;
  handle: string;
  availableForWork: boolean;
  github: string;
  linkedin: string;
  dribbble: string;
  behance: string;
  instagram: string;
  photoMediaId: string | null;
  cvMediaId: string | null;
  seoTitle: string;
  seoDescription: string;
};

const empty: Values = {
  fullName: "",
  shortName: "",
  roles: [],
  headline: "",
  statement: "",
  bio: "",
  location: "",
  timezone: "Asia/Makassar",
  email: "",
  phone: "",
  handle: "",
  availableForWork: true,
  github: "",
  linkedin: "",
  dribbble: "",
  behance: "",
  instagram: "",
  photoMediaId: null,
  cvMediaId: null,
  seoTitle: "",
  seoDescription: "",
};

const fromProfile = (p: AdminProfile): Values => ({
  fullName: p.fullName,
  shortName: p.shortName,
  roles: p.roles,
  headline: p.headline ?? "",
  statement: p.statement ?? "",
  bio: p.bio ?? "",
  location: p.location ?? "",
  timezone: p.timezone,
  email: p.email ?? "",
  phone: p.phone ?? "",
  handle: p.handle ?? "",
  availableForWork: p.availableForWork,
  github: p.socials.github ?? "",
  linkedin: p.socials.linkedin ?? "",
  dribbble: p.socials.dribbble ?? "",
  behance: p.socials.behance ?? "",
  instagram: p.socials.instagram ?? "",
  photoMediaId: p.photoMediaId,
  cvMediaId: p.cvMediaId,
  seoTitle: p.seoTitle ?? "",
  seoDescription: p.seoDescription ?? "",
});

const socialKeys: Array<[keyof Socials, string]> = [
  ["github", "GitHub"],
  ["linkedin", "LinkedIn"],
  ["dribbble", "Dribbble"],
  ["behance", "Behance"],
  ["instagram", "Instagram"],
];

/** /admin/profile — name, hero roles, statement, contact, socials, photo, CV and SEO. */
export function ProfileForm() {
  const toast = useToast();
  const query = useAdminQuery<AdminProfile>("/admin/profile");
  const form = useFormState<Values>(null);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const notSetYet = query.error instanceof AdminApiError && query.error.code === "PROFILE_NOT_SET";
  useUnsavedChangesWarning(form.dirty);

  useEffect(() => {
    if (query.data) {
      primeMedia(query.data.photo);
      form.reset(fromProfile(query.data));
      setUpdatedAt(query.data.updatedAt);
    } else if (notSetYet && !form.values) {
      form.reset(empty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, notSetYet]);

  if (query.error && !notSetYet) return <ErrorState message={errorMessage(query.error)} onRetry={query.reload} />;
  if (!form.values) return <LoadingBlock rows={6} />;

  const v = form.values;
  const e = form.errors;

  async function save() {
    if (!v.fullName.trim() || !v.shortName.trim()) {
      form.setErrors({ ...(v.fullName.trim() ? {} : { fullName: "Full name is required." }), ...(v.shortName.trim() ? {} : { shortName: "Short name is required." }) });
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.put<AdminProfile>("/admin/profile", {
        fullName: v.fullName,
        shortName: v.shortName,
        roles: v.roles.map((r) => r.trim()).filter(Boolean),
        headline: v.headline,
        statement: v.statement,
        bio: v.bio,
        location: v.location,
        timezone: v.timezone.trim() || "Asia/Makassar",
        email: v.email,
        phone: v.phone,
        handle: v.handle,
        availableForWork: v.availableForWork,
        socials: { github: v.github, linkedin: v.linkedin, dribbble: v.dribbble, behance: v.behance, instagram: v.instagram },
        photoMediaId: v.photoMediaId,
        cvMediaId: v.cvMediaId,
        seoTitle: v.seoTitle,
        seoDescription: v.seoDescription,
      });
      form.reset(fromProfile(res.data));
      setUpdatedAt(res.data.updatedAt);
      toast.success("Profile saved.");
    } catch (err) {
      if (err instanceof AdminApiError) {
        // socials.github → github (flat form fields)
        form.setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, m]) => [k.replace(/^socials\./, ""), m])));
      }
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Profile"
        description={notSetYet ? "Your profile is empty — fill it in to replace the placeholder content on the site." : updatedAt ? `Last saved ${formatDateTime(updatedAt)}` : undefined}
      />
      <form
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          void save();
        }}
        className="flex flex-col gap-6 pb-28"
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card title="Identity" description="Used in the hero, navbar, footer and metadata.">
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label="Full name" required value={v.fullName} maxLength={120} onChange={(x) => form.set("fullName", x)} error={e.fullName} />
              <TextField label="Short name" required value={v.shortName} maxLength={60} onChange={(x) => form.set("shortName", x)} error={e.shortName} hint="Shown as “Hi, I'm ___.”" />
            </div>
            <TagInput label="Roles" name="roles" errors={e} values={v.roles} onChange={(x) => form.set("roles", x)} maxItems={6} maxLength={60} placeholder="e.g. Full-Stack Web Developer" hint="Typed one after another in the hero." />
            <TextField label="Headline" value={v.headline} maxLength={255} onChange={(x) => form.set("headline", x)} error={e.headline} hint="Fallback description for search engines." />
            <TextAreaField
              label="Statement"
              rows={3}
              maxLength={2000}
              value={v.statement}
              onChange={(x) => form.set("statement", x)}
              error={e.statement}
              hint="The large sentence in the dark section. Wrap keywords in **double asterisks** to make them bold."
            />
            <TextAreaField label="Bio" rows={4} maxLength={3000} value={v.bio} onChange={(x) => form.set("bio", x)} error={e.bio} />
          </Card>

          <div className="flex flex-col gap-6">
            <Card title="Photo">
              <MediaPicker label="Profile photo" aspect="aspect-[4/4.6]" value={v.photoMediaId} onChange={(x) => form.set("photoMediaId", x)} error={e.photoMediaId} hint="Portrait. Shown in grayscale, in colour on hover." />
            </Card>
            <Card title="CV">
              <MediaPicker label="CV file" kind="pdf" value={v.cvMediaId} onChange={(x) => form.set("cvMediaId", x)} error={e.cvMediaId} hint="PDF up to 5 MB. /cv redirects to this file." />
            </Card>
            <Card title="Availability">
              <Switch label="Available for work" description="Shows the green dot and “Available for work” on the hero card." checked={v.availableForWork} onChange={(x) => form.set("availableForWork", x)} />
            </Card>
          </div>
        </div>

        <Card title="Contact & location">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Email" type="email" value={v.email} maxLength={255} onChange={(x) => form.set("email", x)} error={e.email} />
            <TextField label="Phone" type="tel" value={v.phone} maxLength={40} onChange={(x) => form.set("phone", x)} error={e.phone} />
            <TextField label="Handle" value={v.handle} maxLength={60} placeholder="@yourname" onChange={(x) => form.set("handle", x)} error={e.handle} />
            <TextField label="Location" value={v.location} maxLength={120} placeholder="City, Country" onChange={(x) => form.set("location", x)} error={e.location} />
            <TextField label="Time zone" value={v.timezone} maxLength={60} onChange={(x) => form.set("timezone", x)} error={e.timezone} hint="IANA name for the local clock, e.g. Asia/Makassar, Asia/Jakarta." />
          </div>
        </Card>

        <Card title="Social links" description="Empty links are hidden on the site.">
          <div className="grid gap-5 md:grid-cols-2">
            {socialKeys.map(([key, label]) => (
              <TextField key={key} label={label} type="url" placeholder="https://" value={v[key]} onChange={(x) => form.set(key, x)} error={e[key]} />
            ))}
          </div>
        </Card>

        <Card title="SEO" description="Title and description of the home page in search results and link previews.">
          <TextField label="SEO title" value={v.seoTitle} maxLength={70} showCount onChange={(x) => form.set("seoTitle", x)} error={e.seoTitle} />
          <TextAreaField label="SEO description" rows={2} maxLength={160} showCount value={v.seoDescription} onChange={(x) => form.set("seoDescription", x)} error={e.seoDescription} />
        </Card>

        <SaveBar dirty={form.dirty || notSetYet} saving={saving} onDiscard={query.data ? () => form.reset(fromProfile(query.data!)) : undefined} label={notSetYet ? "Create profile" : "Save profile"} />
      </form>
    </>
  );
}
