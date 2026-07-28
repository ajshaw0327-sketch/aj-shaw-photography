# AJ Shaw Photography

A responsive GitHub Pages photography portfolio for AJ Shaw, featuring Travel
& Street, Events, and Sports work photographed on a Fujifilm X-T50.

## Live website

[ajshaw0327-sketch.github.io/aj-shaw-photography](https://ajshaw0327-sketch.github.io/aj-shaw-photography/)

## Managing photographs

All portfolio photographs live in the repository's `photos` folder:

```text
photos/
├── featured/
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

- Upload images directly into `photos/featured/` to show them on the homepage.
- Create a folder inside `travel`, `events`, or `sports` to make a gallery
  subsection. For example, `photos/sports/01-basketball-vs-central/` becomes
  **Basketball vs Central**.
- Empty folders are not shown. Git does not save truly empty folders, so an
  optional `.gitkeep` file may be used while preparing one.
- Supported formats are JPG, JPEG, PNG, WebP, GIF, and AVIF. Hidden files and
  other formats are ignored.
- Featured photos are separate files. To show an existing gallery image on the
  homepage, upload or copy another copy of it into `photos/featured/`. The site
  does not use references or shortcuts, which keeps management simple in GitHub.

### Optional numbered sorting

Folders and files use natural alphabetical sorting. A numbered prefix gives
precise control:

```text
01-italy-2026/
├── 01-opening-shot.jpg
├── 02-market-at-dusk.jpg
└── 03-train-window.jpg
```

The numbers are hidden on the website. Hyphens and underscores become spaces,
and names are displayed in normal title capitalization.

### Add, replace, move, or delete photos on GitHub

1. Open the destination folder in this repository.
2. Choose **Add file → Upload files**.
3. Drag in the photographs and commit the change to `main`.

To create a new subsection, upload its first photo into a new folder path such
as `photos/events/03-graduation-2026/`. If GitHub asks for a filename while
creating the folder first, create
`photos/events/03-graduation-2026/.gitkeep`; the placeholder is ignored.

To replace a photograph, delete the old file and upload the new version using
the same path and filename. To move a photograph, upload it into the new folder,
confirm it is there, and then delete the old copy. To delete a photograph, open
its file page, use the delete action, and commit. These are ordinary GitHub file
changes—source code never needs to be edited.

Every push that changes `photos/`, the static site, or the build scripts runs the
GitHub Pages workflow. It scans the folders, regenerates the gallery manifest,
and publishes the updated site automatically.

### Image recommendations

- Use lowercase, descriptive, hyphenated filenames such as
  `01-player-at-the-line.jpg`.
- Aim for 1600–2400 pixels on the long edge.
- JPEG or WebP at roughly 75–85% quality is a good balance.
- Keep most files below 3–5 MB; keep animated GIFs especially small.
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

- `photos/` — the only folder AJ needs to manage for portfolio photographs
- `scripts/generate-gallery-manifest.mjs` — scans folders and creates gallery data
- `scripts/build-pages.mjs` — assembles the deployable GitHub Pages site
- `.github/workflows/pages.yml` — rebuilds and deploys the site after pushes
- `docs/` — the preserved retro website, viewer, animations, and character assets
- `app/` — the separate application source retained for local development
