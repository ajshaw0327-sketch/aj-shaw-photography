# AJ Shaw Photography

AJ Shaw’s photography portfolio, with event, portrait, travel, and sports albums,
plus a separate gallery for creative projects. The site uses a retro print and
film style, with cream and forest-green themes, animated photo stacks, and a
full-screen photo viewer.

[Visit the website](https://ajshaw0327-sketch.github.io/aj-shaw-photography/)

## Working on the website

The published website is built from `docs/`, `photos/`, and `projects/` by
`scripts/build-pages.mjs`. The build writes the complete site to `.site/` locally.
Edit the source files and rebuild to preview changes.

Requires Node.js 22.13 or newer. To install dependencies, build, and serve the
same static site that GitHub Pages publishes:

```bash
npm ci
npm run build:pages
python3 -m http.server 4178 --bind 127.0.0.1 --directory .site
```

Open [the local preview](http://127.0.0.1:4178/). After editing source files,
run `npm run build:pages` again and reload the browser.

Useful checks:

```bash
npm run test:gallery  # Folder scanning, names, ordering, and image dimensions
npm test             # Build and run the complete regression suite
```

The separate application in `app/` runs with `npm run dev`. The GitHub Pages
workflow publishes the static build described above.

## Adding and organizing photos

Add photographs under the category where they should appear:

```text
photos/
├── events/
│   └── 02-belmont-stem-night-2026/
├── portraits/
│   ├── 01-Sam-g-senior-portraits/
│   ├── 03 AJ-Shaw-Senior-Portraits-1/
│   └── 04 AJ-Shaw-Senior-Portraits-2/
├── travel/                            # Travel section on the Projects page
│   ├── 07-providence/
│   └── 08-puerto-rico/
├── sports/
│   └── 01-5:28:26-ultimate-game/
├── covers/                            # Curated homepage photo stacks
│   ├── events/
│   ├── portraits/
│   └── sports/
└── featured/
```

- Create a folder inside `events`, `portraits`, `travel`, or `sports` to make an album.
  Nested folders containing photos also become albums.
- Put photos directly in an album folder. Images directly inside a category
  appear in a **Selected Frames** album.
- JPG, JPEG, PNG, WebP, GIF, and AVIF are supported, including uppercase file
  extensions. Empty folders, hidden files, and unsupported formats are ignored.
- To replace a photo, replace the file at the same path. To move or remove a
  photo, move or delete the source file and rebuild.

You can also upload through GitHub using **Add file → Upload files** in the
appropriate folder. Commit the upload to `main`, or merge its branch into
`main`, to publish it.

### Album names and ordering

Number prefixes control the order of albums and individual photographs.
Whole numbers and decimals both work, including in nested folders:

```text
01-providence/
01.15-senior-portraits/
01.5-new-york/
02-puerto-rico/
```

These sort as `1 < 1.15 < 1.5 < 2`. A hyphen after the prefix keeps names easy
to read. The prefix is hidden in the displayed album title, hyphens and
underscores become spaces, and words receive title capitalization.

Short trailing numbers in album names are displayed as Roman numerals. For
example, `04 AJ-Shaw-Senior-Portraits-2` becomes **Aj Shaw Senior Portraits II**.
This applies to trailing positive numbers from 1 to 999. Four-digit years such
as `2026` stay as years.

Each album’s frame numbering starts at **01**, printed below the photographs.
Individual filenames determine order, while visible photo labels use frame
numbers. The frame count sits beside the album title on desktop and below it
on phones.

### Homepage photo stacks

Copy the chosen photographs into `photos/covers/events`, `photos/covers/portraits`,
or `photos/covers/sports`. Edit the `covers` entries in `portfolio.config.json`
to set their initial order. Paths are relative to `photos/` and must match the
actual filenames, including capitalization:

```json
{
  "covers": {
    "events": ["covers/events/01-laying-of-hands-2.jpg"],
    "portraits": ["covers/portraits/DSCF6461.jpg"],
    "sports": ["covers/sports/01-tall-pass.jpg"]
  }
}
```

List up to three photos per category. The build fills any remaining places from
other cover files in filename order, then from gallery photographs. The initial
stack is repeatable. Hovering fans the photos out, and leaving the tile gathers
them with a new photo on top using varied movements.

### Image preparation

- Aim for 1600–2400 pixels on the long edge.
- JPEG or WebP at roughly 75–85% quality is a practical starting point.
- Keep most uploads below 3–5 MB to keep the repository manageable.

The build creates responsive WebP copies, smaller previews, and per-page gallery
data. Originals are preserved. Replacement photos receive new asset revisions
so browsers can load the updated files.

## Browsing albums

- **Browse** shows a horizontal photo strip. Swipe on a phone, use the arrow
  buttons on larger screens, or use left/right arrow keys while the album has
  focus or the pointer is over it. Home and End jump to either end when focused.
- **All photos** expands the album into a grid.
- The chevron at the left of the film strip and the film roll at the right both
  collapse the album. **Open** or the film roll reopens it in Browse mode.
- Selecting a photo opens the full-screen viewer. Use its arrows or left/right
  arrow keys to move between photos, and Escape or the close control to return.
  The page stays in place while the viewer is open.

On phones, the album title and frame count appear first, followed by the
full-width film control and the photographs. Both light and dark themes are
available from the navigation.

## Adding projects

Create one folder per project under `projects/`, with its metadata and media:

```text
projects/
└── 01-project-name/
    ├── project.json
    ├── cover.jpg
    └── film.mp4
```

Published projects appear as large features on **Projects**. They can include a
cover image, MP4/WebM video, description, and external link. Set `published` to
`false` to keep a draft out of the gallery. Featured projects appear first,
followed by the same whole-number and decimal folder ordering used for albums.
See [the project instructions](projects/README.md) for the metadata fields.

FFmpeg is optional for local builds. When available, the build moves MP4
metadata ahead of the footage for quicker playback startup without re-encoding.
The deployment workflow installs FFmpeg automatically.

## Editing text, styling, and interactions

| What to change | Source |
| --- | --- |
| Homepage headings and links | `docs/index.html` |
| About text, camera mention, and contact details | `docs/about.html` |
| Gallery page headings | `docs/events.html`, `docs/portraits.html`, `docs/sports.html`, `docs/projects.html` |
| Projects page layout | `docs/projects.html` |
| Colors, typography, frames, and responsive layout | `docs/style.css` |
| Film controls, photo viewer, menu, and animations | `docs/app.js` |
| Homepage cover choices | `portfolio.config.json` |
| Folder scanning, album names, and sorting | `scripts/generate-gallery-manifest.mjs` |
| Generated gallery markup and image/video processing | `scripts/build-pages.mjs` |

Keep the `<!-- BUILD:... -->` markers in the HTML templates. The builder fills
these with gallery photos, homepage covers, project features, and the About
portrait. Generated files in `.site/` are rebuilt from these sources.

## Publishing

GitHub Actions builds and deploys the site after a push to `main` changes
`docs/`, `photos/`, `projects/`, `scripts/`, `portfolio.config.json`, package
files, or the Pages workflow. Branch changes publish after they are merged into
`main`. The workflow can also be run manually from GitHub Actions.

The workflow uses `node scripts/build-pages.mjs --output _site` and uploads
`_site/` to GitHub Pages. Follow the **Build and deploy photography portfolio**
run in the repository’s Actions tab to confirm publication. A README-only change
does not trigger a site deployment.
