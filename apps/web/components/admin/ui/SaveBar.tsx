"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Spinner } from "./Primitives";

/** Sticky bar at the bottom of edit pages: unsaved-state indicator + save (submits the surrounding form). */
export function SaveBar({ dirty, saving, onDiscard, label = "Save changes" }: { dirty: boolean; saving: boolean; onDiscard?: () => void; label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-md lg:left-[248px]">
      <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-3 px-4 py-3 md:px-8">
        <p className={cn("flex items-center gap-2 text-[13px]", dirty ? "text-text" : "text-text-subtle")} aria-live="polite">
          <span className={cn("size-2 rounded-full", dirty ? "bg-[#c49a3a]" : "bg-success")} aria-hidden="true" />
          {dirty ? "Unsaved changes" : "All changes saved"}
        </p>
        <div className="flex gap-2">
          {dirty && onDiscard && (
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
          )}
          <Button type="submit" size="sm" disabled={saving || !dirty} aria-busy={saving}>
            {saving ? (
              <>
                <Spinner size={13} label="Saving" /> Saving…
              </>
            ) : (
              label
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
