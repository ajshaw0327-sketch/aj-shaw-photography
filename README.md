## Live website

[ajshaw0327-sketch.github.io/aj-shaw-photography](https://ajshaw0327-sketch.github.io/aj-shaw-photography/)

## Managing photographs

All portfolio photographs live in the repository's `photos` folder:

```text
photos/
├── featured/
├── covers/
│   ├── travel/
│   ├── events/
│   └── sports/
├── travel/
│   ├── 01-italy-2026/
│   └── 02-new-york/
├── events/
│   ├── 01-graduation-2026/
│   └── 02-community-festival/
└── sports/
    ├── 01-basketball-vs-central/
    └── 02-soccer-championship/
```

Other creative work lives in the separate `projects` folder:

```text
projects/
└── 01-project-name/
    ├── project.json
    ├── cover.jpg
    └── film.mp4
```

Each published project folder becomes one large feature on **Projects**.
It can showcase a locally hosted MP4/WebM video, a cover image, descriptive
copy, and an optional external project link. See `projects/README.md` for the
editable fields and a complete example. This page is a large-format feature
gallery rather than a collection of photo albums.

- Create a folder inside `travel`, `events`, or `sports` to make a gallery
  subsection.
- Put homepage cover copies in `covers/travel`, `covers/events`, or
  `covers/sports`. The homepage uses these small, curated sets instead of
  selecting a random gallery image.
- Supported formats are JPG, JPEG, PNG, WebP, GIF, and AVIF. Hidden files and
  other formats are ignored.

### Curating the homepage covers

Edit `portfolio.config.json` to list two or three cover files for each category
in the order they should be layered. Paths are relative to `photos/`:

```json
{
  "covers": {
    "travel": ["covers/travel/01-providence-light.jpg"],
    "events": ["covers/events/01-inside-the-dragon.jpg"],
    "sports": ["covers/sports/01-tall-pass.jpg"]
  }
}
```

Cover photographs are intentionally copied into `photos/covers/`; the config
does not reference another gallery file. If a configured cover is missing, the
build uses the remaining cover files in filename order, then the first gallery
photographs as a deterministic fallback. Reloading never changes the selection.

### Numbered sorting

Folders and files use natural alphabetical sorting. A numbered prefix gives
precise control:

The numbers are hidden on the website. Hyphens and underscores become spaces,
and names are displayed in normal title capitalization.

Examples:

- Add: open the destination folder on GitHub, choose **Add file → Upload
  files**, and commit the upload.
- Replace: upload a new file with the same path and filename, then confirm the
  replacement commit.
- Move: edit the file path in GitHub or upload it to the new subsection and
  delete the old copy.
- Delete: open the photograph on GitHub, use **Delete file**, and commit.

Each committed photo change automatically rebuilds and republishes GitHub
Pages. You do not need to edit the gallery HTML or JavaScript.

### Image recommendations

- Use lowercase, descriptive, hyphenated filenames such as
  `01-player-at-the-line.jpg`.
- Aim for 1600–2400 pixels on the long edge.
- JPEG or WebP at roughly 75–85% quality is a good balance.
- Keep most files below 3–5 MB
- Avoid embedding private location or personal information in filenames or
  image metadata.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run build:pages
npm run test:gallery
```

The built GitHub Pages site is written to `.site/`. The normal application can
still be run with `npm run dev`.

## Project structure

- `photos/` — folder to manage portfolio photographs
- `portfolio.config.json` — curated homepage cover order and identity line
- `scripts/generate-gallery-manifest.mjs` — scans folders and creates gallery data
- `scripts/build-pages.mjs` — assembles the deployable GitHub Pages site
- `.github/workflows/pages.yml` — rebuilds and deploys the site after pushes
- `docs/` — the preserved retro website, viewer, animations, and character assets
- `app/` — the separate application source retained for local development
