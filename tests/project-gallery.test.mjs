import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("published project folders become large image and video features", async () => {
  const projectRoot = path.join(repositoryRoot, "projects");
  const fixtureRoot = path.join(projectRoot, "99-test-project");
  const outputRoot = await mkdtemp(path.join(repositoryRoot, ".test-project-gallery-"));

  try {
    await mkdir(fixtureRoot, { recursive: true });
    await writeFile(path.join(fixtureRoot, "cover.png"), Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ));
    await writeFile(path.join(fixtureRoot, "film.mp4"), "project-video-fixture");
    await writeFile(path.join(fixtureRoot, "project.json"), JSON.stringify({
      title: "Test Film Project",
      summary: "A large-format video project test.",
      type: "Film",
      year: "2026",
      cover: "cover.png",
      video: "film.mp4",
      link: "https://example.com/project",
      linkLabel: "View case study",
      published: true,
    }));

    await execFileAsync(process.execPath, ["scripts/build-pages.mjs", "--output", outputRoot], {
      cwd: repositoryRoot,
    });
    const html = await readFile(path.join(outputRoot, "projects.html"), "utf8");

    assert.match(html, /class="project-feature"/);
    assert.match(html, /<video controls preload="metadata" playsinline poster="projects\/99-test-project\/cover\.png"/);
    assert.match(html, /<source src="projects\/99-test-project\/film\.mp4" type="video\/mp4"/);
    assert.match(html, /Test Film Project/);
    assert.match(html, /A large-format video project test\./);
    assert.match(html, /href="https:\/\/example\.com\/project"/);
    assert.doesNotMatch(html, /The project wall is ready\./);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
    await rm(outputRoot, { recursive: true, force: true });
  }
});
