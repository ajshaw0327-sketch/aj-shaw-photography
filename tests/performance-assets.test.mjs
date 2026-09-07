import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..", ".site");
const revision = (content) => createHash("sha256").update(content).digest("hex").slice(0, 12);

test("pages load only their own gallery data and revisioned shared assets", async () => {
  const full = JSON.parse(await readFile(path.join(root, "gallery-manifest.json"), "utf8"));
  const fullBytes = (await stat(path.join(root, "gallery-manifest.js"))).size;
  for (const page of ["home", "events", "travel", "sports", "projects", "about"]) {
    const html = await readFile(path.join(root, page === "home" ? "index.html" : `${page}.html`), "utf8");
    for (const asset of ["app.js", "style.css"]) {
      assert.ok(html.includes(`${asset}?v=${revision(await readFile(path.join(root, asset)))}`));
    }
    if (["projects", "about"].includes(page)) {
      assert.doesNotMatch(html, /src="gallery-manifest/);
      continue;
    }
    const script = await readFile(path.join(root, `gallery-manifest-${page}.js`), "utf8");
    assert.ok(html.includes(`gallery-manifest-${page}.js?v=${revision(script)}`));
    const data = JSON.parse(script.slice(script.indexOf("=") + 1).trim().replace(/;$/, ""));
    assert.ok(Buffer.byteLength(script) < fullBytes);
    if (page === "home") {
      assert.deepEqual(data.covers, full.covers);
      assert.deepEqual(data.featured, full.featured);
      assert.deepEqual(data.galleries, {});
    } else {
      assert.deepEqual(Object.keys(data.galleries), [page]);
      assert.deepEqual(data.galleries[page], full.galleries[page]);
      assert.deepEqual(data.covers, {});
    }
  }
});

test("responsive images have small previews, full useful widths and source-specific URLs", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "gallery-manifest.json"), "utf8"));
  const photos = Object.values(manifest.galleries).flatMap((groups) => groups.flatMap((group) => group.photos));
  for (const photo of photos) {
    if (!photo.responsive?.webp?.length) continue;
    const variants = photo.responsive.webp;
    assert.equal(variants[0].width, Math.min(320, photo.width));
    assert.equal(variants.at(-1).width, Math.min(1600, photo.width));
    assert.equal(new Set(variants.map(({ width }) => width)).size, variants.length);
    for (const variant of variants) {
      assert.match(variant.src, /\.[a-zA-Z0-9]+-[a-f0-9]{12}-\d+\.webp$/);
      assert.ok((await stat(path.join(root, decodeURIComponent(variant.src)))).size > 0);
    }
  }
});

test("compressed Playfair retains a valid font and reduces the original transfer size", async () => {
  const compressed = await readFile(path.join(root, "fonts/playfair-display-variable.woff2"));
  const original = await stat(path.join(root, "fonts/playfair-display-variable.ttf"));
  assert.equal(compressed.toString("ascii", 0, 4), "wOF2");
  assert.ok(compressed.length < original.size * 0.5);
});

test("About uses responsive portrait copies and preserves the original", async () => {
  const html = await readFile(path.join(root, "about.html"), "utf8");
  assert.match(html, /<picture><source type="image\/webp" srcset="images\/responsive\/aj-portrait/);
  assert.match(html, /<img src="aj-portrait\.jpg"[^>]+width="\d+" height="\d+"/);
  assert.deepEqual(await readFile(path.join(root, "aj-portrait.jpg")),
    await readFile(path.resolve(root, "../docs/aj-portrait.jpg")));
});
