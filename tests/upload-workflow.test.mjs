import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const repository = path.resolve(import.meta.dirname, "..");

test("folder uploads, replacements, moves and deletions survive the optimized build", async () => {
  // Work in an isolated tiny repository, never in the user's photo folders.
  const fixture = await mkdtemp(path.join(repository, ".test-upload-workflow-"));
  const photos = path.join(fixture, "photos");
  const sourceId = "travel/01-test_trip/01-café # & view.JPG";
  try {
    await cp(path.join(repository, "scripts"), path.join(fixture, "scripts"), { recursive: true });
    await cp(path.join(repository, "docs"), path.join(fixture, "docs"), { recursive: true });
    await writeFile(path.join(fixture, "portfolio.config.json"), JSON.stringify({
      covers: { travel: ["covers/travel/01-chosen.webp"] },
    }));
    for (const dir of ["travel/01-test_trip", "travel/02-empty", "travel/03-nested/01-inner", "events/01-moved", "featured", "covers/travel"]) {
      await mkdir(path.join(photos, dir), { recursive: true });
    }
    await mkdir(path.join(fixture, "projects"));
    const image = (color) => sharp({ create: { width: 800, height: 600, channels: 3, background: color } });
    const original = await image("#193f31").jpeg().toBuffer();
    await writeFile(path.join(photos, sourceId), original);
    await image("#bd9450").png().toFile(path.join(photos, "travel/01-test_trip/01-café # & view.png"));
    await image("#193f31").webp().toFile(path.join(photos, "covers/travel/01-chosen.webp"));
    await image("#bd9450").avif().toFile(path.join(photos, "travel/03-nested/01-inner/02-frame.avif"));
    await writeFile(path.join(photos, "featured/01-front.jpeg"), original);
    await cp(path.join(repository, "docs/woodstock-spin.gif"), path.join(photos, "travel/01-test_trip/03-motion.gif"));
    await writeFile(path.join(photos, "travel/01-test_trip/.hidden.jpg"), original);
    await writeFile(path.join(photos, "travel/02-empty/.gitkeep"), "");
    await writeFile(path.join(photos, "travel/01-test_trip/ignore.txt"), "unsupported");
    const build = async () => {
      await run(process.execPath, [path.join(fixture, "scripts/build-pages.mjs")], { cwd: fixture });
      return JSON.parse(await readFile(path.join(fixture, ".site/gallery-manifest.json"), "utf8"));
    };
    const all = (manifest, category) => manifest.galleries[category].flatMap((group) => group.photos);
    let manifest = await build();
    assert.deepEqual(manifest.galleries.travel.map((group) => group.title), ["Test Trip", "Inner"]);
    assert.equal(manifest.featured.length, 1);
    assert.equal(manifest.covers.travel[0].id, "covers/travel/01-chosen.webp");
    assert.equal(all(manifest, "travel").length, 4);
    const uploaded = all(manifest, "travel").find((photo) => photo.id === sourceId);
    const initialVariant = uploaded.responsive.webp[0].src;
    assert.match(initialVariant, /caf%C3%A9%20%23%20%26%20view\.JPG-/);
    const png = all(manifest, "travel").find((photo) => photo.id.endsWith(".png"));
    assert.notEqual(initialVariant, png.responsive.webp[0].src, "same basename, different formats cannot overwrite each other");
    assert.equal(all(manifest, "travel").find((photo) => photo.id.endsWith(".gif")).responsive, undefined);
    assert.deepEqual(await readFile(path.join(photos, sourceId)), original);

    const replacement = await image("#765b3b").jpeg().toBuffer();
    await writeFile(path.join(photos, sourceId), replacement);
    manifest = await build();
    const updated = all(manifest, "travel").find((photo) => photo.id === sourceId);
    assert.notEqual(updated.responsive.webp[0].src, initialVariant, "same-name replacement changes browser cache key");
    await assert.rejects(readFile(path.join(fixture, ".site", decodeURIComponent(initialVariant))), { code: "ENOENT" });
    assert.deepEqual(await readFile(path.join(fixture, ".site/photos", sourceId)), replacement);
    assert.deepEqual(await readFile(path.join(photos, sourceId)), replacement);

    const movedId = "events/01-moved/01-café # & view.JPG";
    await rename(path.join(photos, sourceId), path.join(photos, movedId));
    manifest = await build();
    assert.ok(!all(manifest, "travel").some((photo) => photo.id === sourceId));
    assert.equal(all(manifest, "events")[0].id, movedId);
    const movedHtml = await readFile(path.join(fixture, ".site/events.html"), "utf8");
    assert.ok(movedHtml.includes("gallery-01-moved"));

    await rm(path.join(photos, movedId));
    manifest = await build();
    assert.deepEqual(manifest.galleries.events, []);
    const deletedHtml = await readFile(path.join(fixture, ".site/events.html"), "utf8");
    assert.ok(!deletedHtml.includes("gallery-01-moved"));
    await assert.rejects(readFile(path.join(fixture, ".site/photos", movedId)), { code: "ENOENT" });
    const script = await readFile(path.join(fixture, ".site/gallery-manifest-events.js"), "utf8");
    assert.ok(!script.includes(movedId), "deleted upload disappears from enhancement data too");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
