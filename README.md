# AJ Shaw Photography

A responsive GitHub Pages photography portfolio for AJ Shaw, featuring Travel
& Street, Events, and Sports work photographed on a Fujifilm X-T50.

## Live website

[ajshaw0327-sketch.github.io/aj-shaw-photography](https://ajshaw0327-sketch.github.io/aj-shaw-photography/)

## Adding or replacing photographs

The GitHub Pages edition discovers photographs in the `docs` folder
automatically.

1. Open the repository's `docs` folder on GitHub.
2. Choose **Add file → Upload files**.
3. Begin each filename with its portfolio section:
   - `travel-`
   - `events-`
   - `sports-`
4. Commit the upload to `main`.

For example, `travel-cape-cod-sunrise.jpg` appears in Travel & Street.
Portrait and landscape dimensions are detected automatically. To replace a
photograph, upload a new image with the same filename. To remove one, delete
its file from `docs`.

The homepage automatically selects up to two photographs from each section.
New filenames become readable titles automatically; custom captions for the
original portfolio are stored in `docs/app.js`.

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Create a production build with:

```bash
npm run build
```

## Project structure

- `app/page.tsx` — public portfolio and accessible lightbox
- `app/manage/` — private photo manager
- `app/api/photos/` — archive upload and editing endpoints
- `app/media/` — delivery route for uploaded photographs
- `db/schema.ts` — photo archive schema
- `drizzle/` — database migration and original portfolio records
- `public/photos/` — original photographs bundled with the site
- `docs/` — standalone GitHub Pages website and its live photo folder
