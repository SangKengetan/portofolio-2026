import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

/**
 * Hosts that serve uploaded media (`/uploads/*`), for next/image.
 * - NEXT_PUBLIC_MEDIA_HOST: "domain.com" or a full URL such as "https://media.domain.com" / "http://localhost:4000"
 * - API_URL is added automatically so images uploaded in development (http://localhost:4000/uploads/…) work too.
 */
function patternFor(value: string | undefined): RemotePattern | null {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/uploads/**",
    };
  } catch {
    console.warn(`[next.config] Ignoring invalid media host: ${value}`);
    return null;
  }
}

const remotePatterns = [process.env.NEXT_PUBLIC_MEDIA_HOST, process.env.API_URL]
  .map(patternFor)
  .filter((p): p is RemotePattern => p !== null);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No ESLint setup yet — add eslint + eslint-config-next and remove this to lint on build.
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["@portfolio/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns,
  },
};

export default nextConfig;
