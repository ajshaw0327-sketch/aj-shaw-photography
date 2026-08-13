import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  scanPhotoLibrary,
  writeManifestData,
} from "./generate-gallery-manifest.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentIndex = process.argv.indexOf("--output");
const outputDirectory = path.resolve(
  argumentIndex >= 0 ? process.argv[argumentIndex + 1] : path.join(repositoryRoot, ".site"),
);
const docsDirectory = path.join(repositoryRoot, "docs");
const photosDirectory = path.join(repositoryRoot, "photos");
const projectsDirectory = path.join(repositoryRoot, "projects");
const configurationPath = path.join(repositoryRoot, "portfolio.config.json");

if (
  [repositoryRoot, docsDirectory, photosDirectory].includes(outputDirectory) ||
  !outputDirectory.startsWith(`${repositoryRoot}${path.sep}`)
) {
  throw new Error("The Pages output must be a dedicated folder inside this repository.");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function encodeUrlPath(value) {
  return String(value).split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

const projectImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const projectVideoExtensions = new Set([".mp4", ".webm"]);

function naturalSort(left, right) {
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
}

function readableProjectName(value) {
  return String(value || "Project")
    .replace(/^\d+[\s._-]*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function projectFileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function scanProjects() {
  let entries = [];
  try {
    entries = await readdir(projectsDirectory, { withFileTypes: true });
  } catch {
    return [];
  }

  const folders = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => naturalSort(left.name, right.name));
  const projects = [];

  for (const folder of folders) {
    const folderPath = path.join(projectsDirectory, folder.name);
    let files = [];
    try {
      files = (await readdir(folderPath, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
        .sort(naturalSort);
    } catch {
      continue;
    }

    let metadata = {};
    try {
      metadata = JSON.parse(await readFile(path.join(folderPath, "project.json"), "utf8"));
    } catch {
      metadata = {};
    }
    if (metadata.published === false) continue;

    const explicitCover = typeof metadata.cover === "string" && files.includes(metadata.cover)
      && projectImageExtensions.has(path.extname(metadata.cover).toLowerCase()) ? metadata.cover : "";
    const explicitVideo = typeof metadata.video === "string" && files.includes(metadata.video)
      && projectVideoExtensions.has(path.extname(metadata.video).toLowerCase()) ? metadata.video : "";
    const cover = explicitCover && await projectFileExists(path.join(folderPath, explicitCover))
      ? explicitCover
      : files.find((file) => projectImageExtensions.has(path.extname(file).toLowerCase())) || "";
    const video = explicitVideo && await projectFileExists(path.join(folderPath, explicitVideo))
      ? explicitVideo
      : files.find((file) => projectVideoExtensions.has(path.extname(file).toLowerCase())) || "";
    if (!cover && !video && !metadata.link) continue;

    projects.push({
      id: folder.name,
      title: metadata.title || readableProjectName(folder.name),
      summary: metadata.summary || "A project from the AJ Shaw working archive.",
      type: metadata.type || (video ? "Film" : "Project"),
      year: String(metadata.year || "2026"),
      location: metadata.location || "",
      cover: cover ? encodeUrlPath(path.posix.join("projects", folder.name, cover)) : "",
      video: video ? encodeUrlPath(path.posix.join("projects", folder.name, video)) : "",
      link: typeof metadata.link === "string" && /^https?:\/\//i.test(metadata.link) ? metadata.link : "",
      linkLabel: metadata.linkLabel || "Visit project",
      featured: metadata.featured === true,
    });
  }
  return projects.sort((left, right) => Number(right.featured) - Number(left.featured));
}

function renderProjectMedia(project, index) {
  if (project.video) {
    const poster = project.cover ? ` poster="${escapeHtml(project.cover)}"` : "";
    return `<video controls preload="metadata" playsinline${poster} aria-label="Video for ${escapeHtml(project.title)}"><source src="${escapeHtml(project.video)}" type="video/${path.extname(project.video).toLowerCase() === ".webm" ? "webm" : "mp4"}" />Your browser does not support embedded video. <a href="${escapeHtml(project.video)}">Open the video file</a>.</video>`;
  }
  if (project.cover) {
    return `<img src="${escapeHtml(project.cover)}" alt="Cover image for ${escapeHtml(project.title)}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async"${index === 0 ? ' fetchpriority="high"' : ""} />`;
  }
  return `<span class="project-media-placeholder" aria-hidden="true"><i></i><b>Project file</b></span>`;
}

function renderProjectsMarkup(projects) {
  if (!projects.length) {
    return `<div class="projects-empty"><span>PROJECT FILES / READY</span><h2>The project wall is ready.</h2><p>Add a folder inside <code>projects/</code> to publish the first film, research project, design experiment, or community initiative.</p></div>`;
  }

  return projects.map((project, index) => {
    const metadata = [project.type, project.year, project.location].filter(Boolean).join(" · ");
    const externalLink = project.link
      ? `<a class="project-link" href="${escapeHtml(project.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(project.linkLabel)} <span aria-hidden="true">↗</span></a>`
      : "";
    return `<article class="project-feature${project.featured ? " is-featured" : ""}" id="project-${escapeHtml(project.id)}" style="--project-index:${index}">
      <div class="project-media">${renderProjectMedia(project, index)}<span class="project-reference" aria-hidden="true">PRJ-${String(index + 1).padStart(2, "0")}</span></div>
      <div class="project-copy"><p class="project-meta">${escapeHtml(metadata)}</p><h2>${escapeHtml(project.title)}</h2><p>${escapeHtml(project.summary)}</p>${externalLink}</div>
    </article>`;
  }).join("");
}

function renderProjectPortalPreview(projects) {
  const covers = projects.filter((project) => project.cover).slice(0, 3);
  if (!covers.length) {
    return `<span class="project-portal-document" aria-hidden="true"><i></i><b>PROJECT<br />FILES</b><small>FILM · DESIGN · RESEARCH</small></span>`;
  }
  return covers.map((project, index) =>
    `<span class="category-portal-print" style="--portal-index: ${index}" aria-hidden="true"><img src="${escapeHtml(project.cover)}" alt="" loading="${index === 0 ? "eager" : "lazy"}" decoding="async" /></span>`,
  ).join("");
}

function gallerySubsectionId(group, usedIds) {
  const rawId = String(group.id || group.title || "section")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const baseId = `gallery-${rawId || "section"}`;
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function photoClassNames(photo, index) {
  const classes = ["photo-card", `photo-card-size-${(index % 6) + 1}`];
  if (photo.width && photo.height) {
    const ratio = photo.width / photo.height;
    if (ratio < 0.82) classes.push("photo-card-portrait");
    if (ratio > 1.45) classes.push("photo-card-wide");
  }
  return classes.join(" ");
}

function responsiveSource(photo, sizes) {
  const webp = photo.responsive?.webp || [];
  if (!webp.length) return "";
  const srcset = webp.map((source) => `${escapeHtml(source.src)} ${source.width}w`).join(", ");
  return `<source type="image/webp" srcset="${srcset}" sizes="${escapeHtml(sizes)}" />`;
}

function renderPicture(photo, {
  alt = photo.alt,
  sizes,
  loading = "lazy",
  fetchPriority = "auto",
} = {}) {
  const dimensions = photo.width && photo.height
    ? ` width="${photo.width}" height="${photo.height}"`
    : "";
  const priority = fetchPriority === "high" ? ' fetchpriority="high"' : "";
  const fallbackSrcset = photo.width
    ? ` srcset="${escapeHtml(photo.src)} ${photo.width}w" sizes="${escapeHtml(sizes)}"`
    : "";
  return `<picture>${responsiveSource(photo, sizes)}<img src="${escapeHtml(photo.src)}"${fallbackSrcset}${dimensions} alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${priority} /></picture>`;
}

function renderCoverPhotographs(category, photographs) {
  return photographs.map((photo, index) => {
    const loading = index === 0 ? "eager" : "lazy";
    const fetchPriority = category === "events" && index === 0 ? "high" : "auto";
    return `<span class="category-portal-print" data-cover-id="${escapeHtml(photo.id)}" style="--portal-index: ${index}" aria-hidden="true">${renderPicture(photo, {
      alt: "",
      sizes: "(max-width: 860px) 112px, (max-width: 1300px) 18vw, 260px",
      loading,
      fetchPriority,
    })}</span>`;
  }).join("");
}

function renderPhotoCard(photo, localIndex, globalIndex, category) {
  const rotation = [-0.3, 0.22, -0.12, 0.28][globalIndex % 4];
  const ratio = photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3";
  const loading = globalIndex < 2 ? "eager" : "lazy";
  const fetchPriority = globalIndex === 0 ? "high" : "auto";
  const location = photo.detail?.split("·")[0]?.trim() || "AJ archive";
  const reference = `${category.toUpperCase().slice(0, 3)}-${String(globalIndex + 1).padStart(2, "0")}`;
  return `
    <figure class="${photoClassNames(photo, globalIndex)}" data-photo-id="${escapeHtml(photo.id)}" style="--photo-ratio: ${ratio}; --card-rotate: ${rotation}deg; --card-delay: ${Math.min(localIndex, 8) * 45}ms; --section-card-delay: ${Math.min(localIndex, 10) * 36}ms">
      <a class="photo-trigger" href="${escapeHtml(photo.src)}" data-photo-index="${localIndex}" aria-label="View ${escapeHtml(photo.title)}, ${escapeHtml(photo.detail)}">
        <span class="photo-surface">
          <span class="frame-index">${String(globalIndex + 1).padStart(2, "0")}</span>
          <span class="photo-window">
            ${renderPicture(photo, {
              sizes: "(max-width: 640px) 88vw, (max-width: 1100px) 44vw, 470px",
              loading,
              fetchPriority,
            })}
            <span class="photo-metadata" aria-hidden="true">
              <span class="photo-meta-location">${escapeHtml(location)}</span>
              <span class="photo-meta-camera">Fujifilm X-T50</span>
              <span class="photo-meta-frame">${reference}</span>
            </span>
            <span class="open-mark" aria-hidden="true">View ↗</span>
          </span>
        </span>
      </a>
      <figcaption><strong>${escapeHtml(photo.title)}</strong><span>${escapeHtml(photo.detail)}</span></figcaption>
    </figure>`;
}

function renderGalleryMarkup(category, groups) {
  let photoOffset = 0;
  const usedIds = new Set();
  return groups.map((group, groupIndex) => {
    const subsectionId = gallerySubsectionId(group, usedIds);
    const expanded = false;
    const cards = group.photos.map((photo, localIndex) =>
      renderPhotoCard(photo, localIndex, photoOffset + localIndex, category),
    ).join("");
    photoOffset += group.photos.length;
    const archiveCode = { events: "EVT", travel: "TRV", sports: "SPT" }[category] || "AJ";
    return `
      <article class="gallery-subsection${expanded ? " is-expanded" : ""}" id="${subsectionId}" data-default-expanded="${expanded}" style="--subsection-delay: ${Math.min(groupIndex, 6) * 60}ms">
        <h2 class="gallery-subsection-heading">
          <button class="gallery-subsection-toggle" id="${subsectionId}-toggle" type="button" aria-expanded="${expanded}" aria-controls="${subsectionId}-panel">
            <span class="gallery-subsection-title"><span class="gallery-subsection-stamp" aria-hidden="true">${archiveCode}-${String(groupIndex + 1).padStart(2, "0")}</span><span class="gallery-subsection-name">${escapeHtml(group.title)}</span></span>
            <span class="gallery-subsection-meta"><span class="gallery-subsection-count">${String(group.photos.length).padStart(2, "0")} frames</span><span class="gallery-subsection-action-label">${expanded ? "Close collection" : "Expand collection"}</span><span class="gallery-subsection-indicator" aria-hidden="true"></span></span>
          </button>
        </h2>
        <div class="gallery-subsection-panel" id="${subsectionId}-panel" role="region" aria-labelledby="${subsectionId}-toggle">
          <div class="gallery-subsection-panel-inner">
            <div class="gallery-preview-tools" hidden><span class="gallery-scroll-hint" hidden aria-hidden="true">Swipe the contact strip</span><span class="gallery-scroll-controls"><button type="button" data-preview-direction="previous" aria-label="View previous photographs in ${escapeHtml(group.title)}"><span aria-hidden="true">←</span></button><button type="button" data-preview-direction="next" aria-label="View next photographs in ${escapeHtml(group.title)}"><span aria-hidden="true">→</span></button></span></div>
            <div class="photo-grid" id="${subsectionId}-strip" tabindex="0" role="group" aria-label="${escapeHtml(group.title)} preview, ${group.photos.length} photographs. Use the left and right arrow keys to browse.">${cards}
            </div>
          </div>
        </div>
      </article>`;
  }).join("");
}

function replaceMarker(html, marker, value) {
  const token = `<!-- BUILD:${marker} -->`;
  if (!html.includes(token)) throw new Error(`Missing build marker: ${marker}`);
  return html.replace(token, value);
}

function allManifestPhotos(manifest) {
  const records = [
    ...(manifest.featured || []),
    ...Object.values(manifest.covers || {}).flat(),
    ...Object.values(manifest.galleries || {}).flatMap((groups) =>
      groups.flatMap((group) => group.photos || []),
    ),
  ];
  const unique = new Map();
  records.forEach((photo) => unique.set(photo.id, photo));
  return [...unique.values()];
}

async function optimizePhoto(photo) {
  if (!photo.width || !photo.height || path.extname(photo.id).toLowerCase() === ".gif") return;
  const input = path.join(photosDirectory, photo.id);
  const widths = [480, 960, 1600].filter((width) => width < photo.width);
  if (!widths.length) widths.push(photo.width);
  photo.responsive = { webp: [] };
  for (const width of widths) {
    const relativeOutput = path.posix.join(
      "photos",
      "responsive",
      photo.id.replace(/\.[^.]+$/, `-${width}.webp`),
    );
    const absoluteOutput = path.join(outputDirectory, ...relativeOutput.split("/"));
    await mkdir(path.dirname(absoluteOutput), { recursive: true });
    const result = await sharp(input)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(absoluteOutput);
    photo.responsive.webp.push({ src: encodeUrlPath(relativeOutput), width: result.width });
  }
}

async function optimizeManifestPhotographs(manifest, concurrency = 4) {
  const photographs = allManifestPhotos(manifest);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, photographs.length) }, async () => {
    while (nextIndex < photographs.length) {
      const photo = photographs[nextIndex];
      nextIndex += 1;
      await optimizePhoto(photo);
    }
  });
  await Promise.all(workers);
}

async function injectBuiltMarkup(manifest) {
  const projects = await scanProjects();
  const indexPath = path.join(outputDirectory, "index.html");
  let indexHtml = await readFile(indexPath, "utf8");
  indexHtml = replaceMarker(indexHtml, "HOME:IDENTITY", escapeHtml(manifest.identityLine));
  for (const category of ["events", "travel", "sports"]) {
    indexHtml = replaceMarker(
      indexHtml,
      `HOME:COVERS:${category}`,
      renderCoverPhotographs(category, manifest.covers?.[category] || []),
    );
  }
  indexHtml = replaceMarker(indexHtml, "HOME:PROJECTS:PREVIEW", renderProjectPortalPreview(projects));
  await writeFile(indexPath, indexHtml);

  for (const category of ["events", "travel", "sports"]) {
    const pagePath = path.join(outputDirectory, `${category}.html`);
    let html = await readFile(pagePath, "utf8");
    html = replaceMarker(
      html,
      "GALLERY:GROUPS",
      renderGalleryMarkup(category, manifest.galleries?.[category] || []),
    );
    await writeFile(pagePath, html);
  }

  const projectsPath = path.join(outputDirectory, "projects.html");
  let projectsHtml = await readFile(projectsPath, "utf8");
  projectsHtml = replaceMarker(projectsHtml, "PROJECTS:ITEMS", renderProjectsMarkup(projects));
  await writeFile(projectsPath, projectsHtml);
}

const configuration = JSON.parse(await readFile(configurationPath, "utf8"));
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await cp(docsDirectory, outputDirectory, { recursive: true });
await cp(photosDirectory, path.join(outputDirectory, "photos"), { recursive: true });
await cp(projectsDirectory, path.join(outputDirectory, "projects"), { recursive: true });

const manifest = await scanPhotoLibrary(photosDirectory, configuration);
await optimizeManifestPhotographs(manifest);
await writeManifestData({
  manifest,
  jsonOutput: path.join(outputDirectory, "gallery-manifest.json"),
  scriptOutput: path.join(outputDirectory, "gallery-manifest.js"),
});
await injectBuiltMarkup(manifest);

console.log(`GitHub Pages site built at ${outputDirectory}`);
