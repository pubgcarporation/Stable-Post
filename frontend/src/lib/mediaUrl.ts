export function resolveMediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  if (path.startsWith("/")) {
    if (base) return `${base}${path}`;
    return path;
  }
  return path;
}
