import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

const categories = ["events", "travel", "sports"];
const naturalSort = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function isHidden(name) {
  return name.startsWith(".");
}

function isSupportedImage(name) {
  return SUPPORTED_IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function stripNumericPrefix(value) {
  return value.replace(/^\d+[\s._-]+/, "");
}

export function toDisplayName(value) {
  const extension = path.extname(value).toLowerCase();
  const withoutExtension = SUPPORTED_IMAGE_EXTENSIONS.has(extension)
    ? value.slice(0, -extension.length)
    : value;
  const words = stripNumericPrefix(withoutExtension)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const titleWords = words.split(" ").filter(Boolean);
  const minorWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "from",
    "in",
    "into",
    "nor",
    "of",
    "on",
    "or",
    "over",
    "per",
    "the",
    "to",
    "up",
    "via",
    "vs",
    "with",
  ]);

  return titleWords
    .map((word, index) =>
      index > 0 && index < titleWords.length - 1 && minorWords.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function encodeRelativePath(relativePath) {
  return relativePath
    .split(path.sep)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

function readJpegDimensions(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame && offset + 8 < buffer.length) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }
    if (length < 2) break;
    offset += length + 2;
  }
  return null;
}

function readWebpDimensions(buffer) {
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)),
    };
  }
  if (
    chunk === "VP8 " &&
    buffer.length >= 30 &&
    buffer[23] === 0x9d &&
    buffer[24] === 0x01 &&
    buffer[25] === 0x2a
  ) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
}

function readAvifDimensions(buffer) {
  for (let offset = 4; offset + 16 <= buffer.length; offset += 1) {
    if (buffer.toString("ascii", offset, offset + 4) !== "ispe") continue;
    const width = buffer.readUInt32BE(offset + 8);
    const height = buffer.readUInt32BE(offset + 12);
    if (width && height) return { width, height };
  }
  return null;
}

export async function readImageDimensions(filePath) {
  const buffer = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (
    extension === ".png" &&
    buffer.length >= 24 &&
    buffer.toString("ascii", 1, 4) === "PNG"
  ) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (
    extension === ".gif" &&
    buffer.length >= 10 &&
    buffer.toString("ascii", 0, 3) === "GIF"
  ) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (
    [".jpg", ".jpeg"].includes(extension) &&
    buffer.length >= 4 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8
  ) {
    return readJpegDimensions(buffer);
  }
  if (
    extension === ".webp" &&
    buffer.length >= 16 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return readWebpDimensions(buffer);
  }
  if (extension === ".avif") {
    return readAvifDimensions(buffer);
  }
  return null;
}

async function imageFilesDirectlyInside(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && !isHidden(entry.name) && isSupportedImage(entry.name))
    .map((entry) => entry.name)
    .sort(naturalSort.compare);
}

async function imageGroupsInside(directory, relativeDirectory = "") {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = entries
    .filter((entry) => entry.isFile() && !isHidden(entry.name) && isSupportedImage(entry.name))
    .map((entry) => entry.name)
    .sort(naturalSort.compare);

  const childDirectories = entries
    .filter((entry) => entry.isDirectory() && !isHidden(entry.name))
    .sort((a, b) => naturalSort.compare(a.name, b.name));

  const groups = files.length ? [{ relativeDirectory, files }] : [];
  for (const child of childDirectories) {
    const childRelative = path.join(relativeDirectory, child.name);
    groups.push(
      ...(await imageGroupsInside(path.join(directory, child.name), childRelative)),
    );
  }
  return groups;
}

async function photoRecord(photosRoot, relativePath, detail, category) {
  const filename = path.basename(relativePath);
  const title = toDisplayName(filename) || "Untitled Photograph";
  let dimensions = null;
  try {
    dimensions = await readImageDimensions(path.join(photosRoot, relativePath));
  } catch {
    // A supported file can still render even when its metadata cannot be read.
  }

  return {
    id: relativePath.split(path.sep).join("/"),
    src: `photos/${encodeRelativePath(relativePath)}`,
    title,
    detail,
    alt: `Photograph of “${title}” from ${detail}, by AJ Shaw.`,
    category,
    ...(dimensions || {}),
  };
}

function normalizedConfiguredPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^photos\//, "");
}

function chooseCoverPhotographs(category, available, galleries, configured = []) {
  const byId = new Map(available.map((photo) => [photo.id, photo]));
  const candidates = [
    ...configured.map((value) => byId.get(normalizedConfiguredPath(value))).filter(Boolean),
    ...available,
    ...(galleries[category] || []).flatMap((group) => group.photos || []),
  ];
  const selected = [];
  const used = new Set();
  for (const photo of candidates) {
    if (!photo?.src || used.has(photo.src)) continue;
    selected.push(photo);
    used.add(photo.src);
    if (selected.length === 3) break;
  }
  return selected;
}

export async function scanPhotoLibrary(photosRoot, configuration = {}) {
  const featuredFiles = await imageFilesDirectlyInside(path.join(photosRoot, "featured"));
  const featured = await Promise.all(
    featuredFiles.map((filename) =>
      photoRecord(photosRoot, path.join("featured", filename), "Featured selection", "featured"),
    ),
  );

  const galleries = {};
  for (const category of categories) {
    const categoryRoot = path.join(photosRoot, category);
    const groups = await imageGroupsInside(categoryRoot);
    galleries[category] = await Promise.all(
      groups.map(async ({ relativeDirectory, files }) => {
        const title = relativeDirectory
          ? toDisplayName(path.basename(relativeDirectory))
          : "Selected Frames";
        const detail = `${title} · ${toDisplayName(category)} journal`;
        return {
          id: relativeDirectory.split(path.sep).join("/") || "selected-frames",
          title,
          photos: await Promise.all(
            files.map((filename) =>
              photoRecord(
                photosRoot,
                path.join(category, relativeDirectory, filename),
                detail,
                category,
              ),
            ),
          ),
        };
      }),
    );
  }

  const covers = {};
  for (const category of categories) {
    const coverFiles = await imageFilesDirectlyInside(
      path.join(photosRoot, "covers", category),
    );
    const available = await Promise.all(
      coverFiles.map((filename) =>
        photoRecord(
          photosRoot,
          path.join("covers", category, filename),
          `${toDisplayName(category)} cover selection`,
          category,
        ),
      ),
    );
    covers[category] = chooseCoverPhotographs(
      category,
      available,
      galleries,
      configuration.covers?.[category],
    );
  }

  return {
    version: 2,
    generatedAt: new Date().toISOString(),
    identityLine:
      configuration.identityLine || "Photography by AJ Shaw · Massachusetts",
    featured,
    covers,
    galleries,
  };
}

export async function writeManifestData({ manifest, jsonOutput, scriptOutput }) {
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(jsonOutput, json);
  if (scriptOutput) {
    await writeFile(
      scriptOutput,
      `window.__AJ_PHOTO_MANIFEST__ = ${JSON.stringify(manifest)};\n`,
    );
  }
  return manifest;
}

export async function writeManifest({ photosRoot, jsonOutput, scriptOutput, configuration }) {
  const manifest = await scanPhotoLibrary(photosRoot, configuration);
  return writeManifestData({ manifest, jsonOutput, scriptOutput });
}

function cliValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const isDirectRun =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const photosRoot = path.resolve(cliValue("--photos", path.join(repositoryRoot, "photos")));
  const output = path.resolve(
    cliValue("--output", path.join(repositoryRoot, "docs", "gallery-manifest.json")),
  );
  const scriptOutput = path.resolve(
    cliValue(
      "--script-output",
      path.join(repositoryRoot, "docs", "gallery-manifest.js"),
    ),
  );
  await writeManifest({ photosRoot, jsonOutput: output, scriptOutput });
}
