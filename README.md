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

- Create a folder inside `travel`, `events`, or `sports` to make a gallery
  subsection.
- Supported formats are JPG, JPEG, PNG, WebP, GIF, and AVIF. Hidden files and
  other formats are ignored.

### Numbered sorting

Folders and files use natural alphabetical sorting. A numbered prefix gives
precise control:

The numbers are hidden on the website. Hyphens and underscores become spaces,
and names are displayed in normal title capitalization.

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
- `scripts/generate-gallery-manifest.mjs` — scans folders and creates gallery data
- `scripts/build-pages.mjs` — assembles the deployable GitHub Pages site
- `.github/workflows/pages.yml` — rebuilds and deploys the site after pushes
- `docs/` — the preserved retro website, viewer, animations, and character assets
- `app/` — the separate application source retained for local development
