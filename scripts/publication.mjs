import { spawnSync } from "node:child_process";

// Publication time is stable across later copy edits. Explicit dates take precedence.
export function firstPublished(
  file,
  fallback,
  { explicit, content = false } = {},
) {
  if (explicit) {
    if (!Number.isFinite(Date.parse(explicit)))
      throw Error(`Invalid publishedAt: ${file}`);
    return new Date(explicit).toISOString();
  }
  const log = spawnSync(
    "git",
    ["log", "--reverse", "--format=%H %cI", "--", file],
    { encoding: "utf8", windowsHide: true },
  );
  if (log.status === 0) {
    for (const line of log.stdout.trim().split("\n").filter(Boolean)) {
      const [sha, date] = line.split(" ");
      if (content) {
        const show = spawnSync(
          "git",
          ["show", `${sha}:${file.replaceAll("\\", "/")}`],
          { encoding: "utf8", windowsHide: true },
        );
        try {
          if (JSON.parse(show.stdout).status !== "published") continue;
        } catch {
          continue;
        }
      }
      return new Date(date).toISOString();
    }
  }
  return new Date(fallback).toISOString();
}
export function newest(records, limit = 3) {
  return [...records]
    .sort(
      (a, b) =>
        Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}
