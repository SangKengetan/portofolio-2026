"use client";

import { useEffect, useRef } from "react";
import type { Certificate } from "@portfolio/shared";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SmartImage } from "@/components/ui/SmartImage";
import { formatDate } from "@/lib/utils";

/**
 * Preview dialog built on the native <dialog> element: focus trap, Esc to close
 * and aria-modal come for free; we restore focus to the opener on close.
 */
export function CertificateModal({ certificate, onClose }: { certificate: Certificate | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (certificate && !dialog.open) {
      opener.current = document.activeElement;
      dialog.showModal();
    } else if (!certificate && dialog.open) {
      dialog.close();
    }
  }, [certificate]);

  const handleClose = () => {
    onClose();
    if (opener.current instanceof HTMLElement) opener.current.focus();
  };

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      aria-labelledby="certificate-title"
      className="m-auto w-[min(920px,calc(100vw_-_32px))] max-w-none rounded-xl bg-surface p-0 text-text backdrop:bg-[rgba(26,26,24,0.7)] backdrop:backdrop-blur-sm open:animate-[page-fade_200ms_ease-out]"
    >
      {certificate && (
        <div className="grid md:grid-cols-[1.4fr_1fr]">
          <div className="relative aspect-[1.414/1] bg-surface-2">
            {certificate.image ? (
              <SmartImage src={certificate.image.url} alt={certificate.image.alt} fill sizes="(min-width: 768px) 540px, 100vw" className="object-contain" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-label text-text-subtle">No preview</div>
            )}
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-label text-text-subtle">{certificate.issuer}</p>
              <button
                type="button"
                onClick={() => ref.current?.close()}
                aria-label="Close preview"
                className="-mt-2 -mr-2 grid size-9 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <h2 id="certificate-title" className="text-h3 text-text">
              {certificate.title}
            </h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-small">
              <dt className="text-text-subtle">Issued</dt>
              <dd className="text-text">{formatDate(certificate.issuedAt)}</dd>
              {certificate.expiresAt && (
                <>
                  <dt className="text-text-subtle">Expires</dt>
                  <dd className="text-text">{formatDate(certificate.expiresAt)}</dd>
                </>
              )}
              {certificate.credentialId && (
                <>
                  <dt className="text-text-subtle">Credential ID</dt>
                  <dd className="font-mono text-text">{certificate.credentialId}</dd>
                </>
              )}
            </dl>
            <div className="mt-auto pt-2">
              {certificate.credentialUrl ? (
                <Button href={certificate.credentialUrl} external icon="arrow-up-right" size="md">
                  View credential
                </Button>
              ) : (
                <p className="text-small text-text-subtle">No online credential available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
