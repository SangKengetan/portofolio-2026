"use client";

import { MediaLibrary } from "../media/MediaLibrary";
import { PageHeader } from "../ui/Primitives";

export function MediaPage() {
  return (
    <>
      <PageHeader title="Media" description="Images are converted to WebP in three sizes and stripped of EXIF data. Files that are still used can't be deleted." />
      <MediaLibrary mode="manage" />
    </>
  );
}
