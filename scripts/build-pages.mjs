import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeManifest } from "./generate-gallery-manifest.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentIndex = process.argv.indexOf("--output");
const outputDirectory = path.resolve(
  argumentIndex >= 0 ? process.argv[argumentIndex + 1] : path.join(repositoryRoot, ".site"),
);
const docsDirectory = path.join(repositoryRoot, "docs");
const photosDirectory = path.join(repositoryRoot, "photos");

if (
  [repositoryRoot, docsDirectory, photosDirectory].includes(outputDirectory) ||
  !outputDirectory.startsWith(`${repositoryRoot}${path.sep}`)
) {
  throw new Error("The Pages output must be a dedicated folder inside this repository.");
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(docsDirectory, outputDirectory, { recursive: true });
await cp(photosDirectory, path.join(outputDirectory, "photos"), { recursive: true });
await writeManifest({
  photosRoot: photosDirectory,
  jsonOutput: path.join(outputDirectory, "gallery-manifest.json"),
  scriptOutput: path.join(outputDirectory, "gallery-manifest.js"),
});

console.log(`GitHub Pages site built at ${outputDirectory}`);
