import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { firstPublished, newest } from "../scripts/publication.mjs";
test("newest uses publication time rather than last modification", () => {
  const rows = [
    { id: "old", publishedAt: "2025-01-01", updated: "2026-10-22" },
    { id: "new", publishedAt: "2026-10-20", updated: "2026-10-20" },
  ];
  assert.equal(newest(rows, 1)[0].id, "new");
});
test("draft commits do not count as publication and later edits do not reset it", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hub-published-"));
  const cwd = process.cwd();
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  try {
    git("init");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "Test");
    writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify({ status: "draft" }),
    );
    git("add", ".");
    git("commit", "-m", "Draft");
    writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify({ status: "published" }),
    );
    git("add", ".");
    git("commit", "-m", "Publish");
    const expected = git("log", "-1", "--format=%cI");
    writeFileSync(
      path.join(dir, "meta.json"),
      JSON.stringify({ status: "published", title: "Updated" }),
    );
    git("add", ".");
    git("commit", "-m", "Revise");
    process.chdir(dir);
    assert.equal(
      firstPublished("meta.json", "2020-01-01", { content: true }),
      new Date(expected).toISOString(),
    );
  } finally {
    process.chdir(cwd);
    rmSync(dir, { recursive: true, force: true });
  }
});
