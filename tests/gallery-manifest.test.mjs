import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  readImageDimensions,
  scanPhotoLibrary,
  toDisplayName,
} from "../scripts/generate-gallery-manifest.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const landscape = path.join(
  repositoryRoot,
  "photos/travel/01-providence/01-providence-light.jpg",
);
const portrait = path.join(
  repositoryRoot,
  "photos/events/01-BPAC-lunar-new-year-event/01-inside-the-dragon.jpg",
);
const gif = path.join(repositoryRoot, "docs/woodstock-spin.gif");
const png = path.join(repositoryRoot, "docs/snoopy-flowers-still.png");

async function copyFixture(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination);
}

test("folder names become predictable gallery sections without empty or hidden entries", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aj-gallery-"));

  await copyFixture(landscape, path.join(root, "featured/01-opening # shot.JPG"));
  await copyFixture(landscape, path.join(root, "featured/nested/02-not-featured.jpg"));
  await copyFixture(landscape, path.join(root, "travel/01-italy-2026/01-opening-shot.jpg"));
  await copyFixture(portrait, path.join(root, "travel/01-italy-2026/02-tall_portrait.jpeg"));
  await mkdir(path.join(root, "travel/02-empty"), { recursive: true });
  await writeFile(path.join(root, "travel/02-empty/.gitkeep"), "");
  await copyFixture(landscape, path.join(root, "travel/03-hidden/.secret.jpg"));
  await copyFixture(
    landscape,
    path.join(root, "travel/04-japan/01-tokyo_nights/01-crossing.jpg"),
  );
  await copyFixture(png, path.join(root, "events/02-community_festival/03-strange # name.png"));
  await copyFixture(gif, path.join(root, "sports/01-warm-up.gif"));
  await writeFile(path.join(root, "sports/ignore-me.txt"), "unsupported");

  const manifest = await scanPhotoLibrary(root);

  assert.equal(manifest.featured.length, 1);
  assert.equal(manifest.featured[0].title, "Opening # Shot");
  assert.match(manifest.featured[0].src, /opening%20%23%20shot\.JPG$/);

  assert.deepEqual(
    manifest.galleries.travel.map((section) => section.title),
    ["Italy 2026", "Tokyo Nights"],
  );
  assert.deepEqual(
    manifest.galleries.travel.map((section) => section.id),
    ["01-italy-2026", "04-japan/01-tokyo_nights"],
  );
  assert.deepEqual(
    manifest.galleries.travel.map((section) => section.photos.length),
    [2, 1],
  );
  assert.deepEqual(
    manifest.galleries.travel[0].photos.map((photo) => photo.title),
    ["Opening Shot", "Tall Portrait"],
  );
  assert.ok(
    manifest.galleries.travel[0].photos[0].width >
      manifest.galleries.travel[0].photos[0].height,
  );
  assert.ok(
    manifest.galleries.travel[0].photos[1].height >
      manifest.galleries.travel[0].photos[1].width,
  );
  assert.deepEqual(
    manifest.galleries.events.map((section) => section.title),
    ["Community Festival"],
  );
  assert.equal(manifest.galleries.sports[0].title, "Selected Frames");
  assert.equal(manifest.galleries.sports[0].photos[0].title, "Warm Up");
});

test("display names hide numbered prefixes and normalize separators", () => {
  assert.equal(toDisplayName("01-basketball_vs-central"), "Basketball vs Central");
  assert.equal(toDisplayName("002-opening-shot.avif"), "Opening Shot");
});

test("AVIF and WebP metadata readers reserve their image space", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "aj-formats-"));
  const avifPath = path.join(root, "sample.avif");
  const avif = Buffer.alloc(20);
  avif.writeUInt32BE(20, 0);
  avif.write("ispe", 4, "ascii");
  avif.writeUInt32BE(1200, 12);
  avif.writeUInt32BE(1600, 16);
  await writeFile(avifPath, avif);

  const webpPath = path.join(root, "sample.webp");
  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0, "ascii");
  webp.write("WEBP", 8, "ascii");
  webp.write("VP8X", 12, "ascii");
  const widthMinusOne = 1599;
  const heightMinusOne = 899;
  webp[24] = widthMinusOne & 0xff;
  webp[25] = (widthMinusOne >> 8) & 0xff;
  webp[26] = (widthMinusOne >> 16) & 0xff;
  webp[27] = heightMinusOne & 0xff;
  webp[28] = (heightMinusOne >> 8) & 0xff;
  webp[29] = (heightMinusOne >> 16) & 0xff;
  await writeFile(webpPath, webp);

  assert.deepEqual(await readImageDimensions(avifPath), {
    width: 1200,
    height: 1600,
  });
  assert.deepEqual(await readImageDimensions(webpPath), {
    width: 1600,
    height: 900,
  });
});
