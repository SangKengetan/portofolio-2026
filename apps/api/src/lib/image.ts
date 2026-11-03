import sharp from "sharp";

export interface ProcessedImage {
  name: "sm" | "md" | "lg";
  buffer: Buffer;
  width: number;
  height: number;
}

/** Section 12: WebP variants of 480 / 960 / 1600 px, EXIF removed, never enlarged. */
const VARIANTS = [
  { name: "sm", width: 480 },
  { name: "md", width: 960 },
  { name: "lg", width: 1600 },
] as const;

/** Rejects decompression bombs: a tiny file that expands to a gigantic bitmap. */
const MAX_PIXELS = 50_000_000;

export async function processImage(input: Buffer, animated: boolean): Promise<ProcessedImage[]> {
  const base = () =>
    sharp(input, { animated, limitInputPixels: MAX_PIXELS, failOn: "error" }).rotate(); // rotate() applies EXIF orientation, then metadata is dropped

  const out: ProcessedImage[] = [];
  for (const v of VARIANTS) {
    const { data, info } = await base()
      .resize({ width: v.width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    out.push({
      name: v.name,
      buffer: data,
      width: info.width,
      // For animated images `info.height` is the whole frame stack; pageHeight is one frame.
      height: info.pageHeight ?? info.height,
    });
  }
  return out;
}
