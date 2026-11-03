"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { adminApi, AdminApiError, errorMessage } from "@/lib/admin/api";
import { formatDateTime, statusOptions } from "@/lib/admin/format";
import { useAdminQuery, useFormState, useUnsavedChangesWarning } from "@/lib/admin/hooks";
import type { PublishStatus } from "@/lib/admin/types";
import { Button } from "@/components/ui/Button";
import { useConfirm, useCounts, useToast } from "../AdminProviders";
import { SelectField } from "../ui/Field";
import { Card, ErrorState, LoadingBlock, PageHeader, StatusBadge } from "../ui/Primitives";
import { SaveBar } from "../ui/SaveBar";

type FormValues = Record<string, unknown> & { status: PublishStatus };

interface ResourceEditorProps<D extends { id: string; updatedAt: string; status: PublishStatus }, V extends FormValues> {
  id?: string;
  endpoint: string;
  basePath: string;
  singular: string;
  listLabel: string;
  empty: V;
  fromDetail: (detail: D) => V;
  toBody: (values: V) => Record<string, unknown>;
  validate?: (values: V) => Record<string, string>;
  title: (values: V) => string;
  /** Called with the loaded detail (e.g. to prime the media cache). */
  onLoaded?: (detail: D) => void;
  children: (ctx: { values: V; set: <K extends keyof V>(key: K, value: V[K]) => void; errors: Record<string, string> }) => ReactNode;
}

/** Shared create/edit page: load, validate, save (POST/PUT), delete, unsaved-changes guard. */
export function ResourceEditor<D extends { id: string; updatedAt: string; status: PublishStatus }, V extends FormValues>({
  id,
  endpoint,
  basePath,
  singular,
  listLabel,
  empty,
  fromDetail,
  toBody,
  validate,
  title,
  onLoaded,
  children,
}: ResourceEditorProps<D, V>) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { refresh: refreshCounts } = useCounts();
  const isNew = !id;
  const detail = useAdminQuery<D>(id ? `${endpoint}/${id}` : null);
  const form = useFormState<V>(isNew ? empty : null);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [savedStatus, setSavedStatus] = useState<PublishStatus | null>(null);
  useUnsavedChangesWarning(form.dirty);

  useEffect(() => {
    if (!detail.data) return;
    onLoaded?.(detail.data);
    form.reset(fromDetail(detail.data));
    setUpdatedAt(detail.data.updatedAt);
    setSavedStatus(detail.data.status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data]);

  const back = { href: basePath, label: listLabel };
  if (detail.error) {
    return (
      <>
        <PageHeader title={singular} back={back} />
        <ErrorState message={detail.error instanceof AdminApiError && detail.error.status === 404 ? `This ${singular.toLowerCase()} does not exist.` : errorMessage(detail.error)} onRetry={detail.reload} />
      </>
    );
  }
  if (!form.values) {
    return (
      <>
        <PageHeader title={`Loading…`} back={back} />
        <LoadingBlock rows={4} />
      </>
    );
  }
  const values = form.values;

  async function save() {
    const local = validate?.(values) ?? {};
    if (Object.keys(local).length) {
      form.setErrors(local);
      toast.error("Some fields need attention.");
      return;
    }
    setSaving(true);
    try {
      const res = id ? await adminApi.put<D>(`${endpoint}/${id}`, toBody(values)) : await adminApi.post<D>(endpoint, toBody(values));
      form.reset(fromDetail(res.data));
      setUpdatedAt(res.data.updatedAt);
      setSavedStatus(res.data.status);
      toast.success(isNew ? `${singular} created.` : "Saved.");
      void refreshCounts();
      if (isNew) router.replace(`${basePath}/${res.data.id}`);
    } catch (err) {
      if (err instanceof AdminApiError) form.setErrors(err.fields);
      toast.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    const ok = await confirm({ title: `Delete “${title(values)}”?`, description: "It is removed from the site.", confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    try {
      await adminApi.del(`${endpoint}/${id}`);
      toast.success(`${singular} deleted.`);
      void refreshCounts();
      router.push(basePath);
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <>
      <PageHeader
        title={isNew ? `New ${singular.toLowerCase()}` : title(values) || singular}
        back={back}
        description={
          !isNew && savedStatus ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <StatusBadge status={savedStatus} />
              {updatedAt && <span>Last saved {formatDateTime(updatedAt)}</span>}
            </span>
          ) : undefined
        }
      />
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="flex flex-col gap-6 pb-28"
      >
        {children({ values, set: form.set, errors: form.errors })}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Visibility">
            <SelectField label="Status" value={values.status} options={statusOptions} onChange={(x) => form.set("status", x as V["status"])} error={form.errors.status} />
          </Card>
          {!isNew && (
            <Card title="Danger zone">
              <p className="text-[13.5px] text-text-muted">Deleting removes it from the site.</p>
              <Button variant="danger" size="sm" iconLeft="trash" onClick={remove} className="w-fit">
                Delete {singular.toLowerCase()}
              </Button>
            </Card>
          )}
        </div>

        <SaveBar dirty={form.dirty || isNew} saving={saving} onDiscard={!isNew && detail.data ? () => form.reset(fromDetail(detail.data!)) : undefined} label={isNew ? `Create ${singular.toLowerCase()}` : "Save changes"} />
      </form>
    </>
  );
}
