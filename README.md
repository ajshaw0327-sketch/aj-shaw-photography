# AJ Shaw Photography

A responsive photography portfolio for AJ Shaw, featuring Travel & Street,
Events, and Sports work photographed on a Fujifilm X-T50.

## Managing photographs

The live site includes a private photo manager at:

`https://alex-morgan-photo-journal.ajshaw0327.chatgpt.site/manage`

Sign in with the AJ Shaw ChatGPT account. From there you can:

- upload JPG, PNG, and WebP photographs up to 20 MB;
- choose Travel & Street, Events, or Sports;
- feature or remove a photograph from the homepage;
- edit titles, locations, event details, and accessible descriptions;
- replace an existing image without recreating its entry; and
- remove work from the portfolio.

The gallery reads the live photo archive and automatically adapts its mixed
portrait and landscape layouts after every change.

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

The hosted version uses a D1 database for photo information and R2 object
storage for image files. `ADMIN_EMAIL` controls access to the private manager.

## Project structure

- `app/page.tsx` — public portfolio and accessible lightbox
- `app/manage/` — private photo manager
- `app/api/photos/` — archive upload and editing endpoints
- `app/media/` — delivery route for uploaded photographs
- `db/schema.ts` — photo archive schema
- `drizzle/` — database migration and original portfolio records
- `public/photos/` — original photographs bundled with the site
