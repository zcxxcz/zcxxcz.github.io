import { load } from "cheerio";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
export const origin = "https://zcxxcz.github.io";
export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const json = async (p) => JSON.parse(await readFile(p, "utf8"));
export function text(html) {
  const $ = load(html);
  $("script,style,nav,header,footer,.sidebar,.page-toc").remove();
  return ($("article").text() || $("main").text() || $("body").text())
    .replace(/\s+/g, " ")
    .trim();
}
export function uniqueText(parts) {
  return [
    ...new Set(
      parts
        .flatMap((s) => s.split(/(?<=[。！？\n])/))
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].join("\n");
}
export function validate(records) {
  const ids = new Set(),
    urls = new Set();
  for (const r of records) {
    for (const k of ["id", "title", "type", "summary", "url", "updated"])
      if (typeof r[k] !== "string" || !r[k].trim())
        throw Error(`Missing ${k}: ${r.id}`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(r.id)) throw Error(`Invalid id: ${r.id}`);
    if (ids.has(r.id) || urls.has(r.url))
      throw Error(`Duplicate record: ${r.id}`);
    ids.add(r.id);
    urls.add(r.url);
    const u = new URL(r.url, origin);
    if (u.protocol !== "https:" || u.hostname !== "zcxxcz.github.io")
      throw Error(`Unexpected public URL: ${r.url}`);
    if (!Array.isArray(r.tags) || !r.tags.every((t) => typeof t === "string"))
      throw Error(`Invalid tags: ${r.id}`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(r.updated) ||
      Number.isNaN(Date.parse(r.updated))
    )
      throw Error(`Invalid date: ${r.id}`);
  }
}
export async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw Error(`Symlink not allowed: ${p}`);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out;
}
export async function checkLinks(root) {
  for (const file of (await files(root)).filter((p) => p.endsWith(".html"))) {
    const $ = load(await readFile(file, "utf8"));
    for (const el of $("[href],[src]").toArray()) {
      const raw = $(el).attr("href") || $(el).attr("src");
      if (
        !raw ||
        /^(https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i.test(raw)
      )
        continue;
      const [pathname, hash] = raw.split("#");
      const clean = decodeURIComponent(pathname.split("?")[0]);
      let target = clean.startsWith("/")
        ? path.join(root, clean)
        : path.resolve(path.dirname(file), clean || path.basename(file));
      if (
        !path.resolve(target).startsWith(path.resolve(root) + path.sep) &&
        path.resolve(target) !== path.resolve(root)
      )
        throw Error(`Escaping link: ${file} ${raw}`);
      let st;
      try {
        st = await stat(target);
      } catch {
        throw Error(`Broken link: ${file} → ${raw}`);
      }
      if (st.isDirectory()) target = path.join(target, "index.html");
      await stat(target);
      if (hash && target.endsWith(".html")) {
        const doc = load(await readFile(target, "utf8"));
        if (
          !doc("[id]")
            .toArray()
            .some((n) => doc(n).attr("id") === decodeURIComponent(hash))
        )
          throw Error(`Broken anchor: ${file} → ${raw}`);
      }
    }
  }
}
