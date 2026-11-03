import Image, { type ImageProps } from "next/image";

/**
 * next/image wrapper.
 * - SVG placeholders skip the optimiser (Next refuses to optimise SVG by default).
 * - Plain-http sources (the API on http://localhost:4000 during development) are shown as-is;
 *   in production media is served over https from NEXT_PUBLIC_MEDIA_HOST and optimised as usual.
 */
export function SmartImage(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : "";
  return <Image {...props} unoptimized={props.unoptimized ?? (src.endsWith(".svg") || src.startsWith("http://"))} />;
}
