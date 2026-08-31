import { apiOrigin } from "./api";

export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = apiOrigin();
  if (path.startsWith("/")) return base ? `${base}${path}` : path;
  return path;
}
