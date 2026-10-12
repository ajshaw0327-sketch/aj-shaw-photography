# Projects

Create one folder per project. Each folder needs a `project.json` file and may
contain a cover image and a locally hosted video.

```text
projects/
└── 01-project-name/
    ├── project.json
    ├── cover.jpg
    └── film.mp4
```

Example `project.json`:

```json
{
  "title": "Project title",
  "summary": "A short description of the work and why it matters.",
  "type": "Film",
  "year": "2026",
  "location": "Massachusetts",
  "cover": "cover.jpg",
  "video": "film.mp4",
  "link": "https://example.com",
  "linkLabel": "Visit project",
  "featured": true,
  "published": true
}
```

- `cover`, `video`, `link`, `location`, and `featured` are optional.
- Supported cover images: JPG, JPEG, PNG, WebP, GIF, and AVIF.
- Supported local videos: MP4 and WebM. MP4 is recommended for broad support.
- Set `published` to `false` while preparing a project.
- Numbered folder prefixes control order and are hidden on the website.
- Each published folder becomes one large project feature, not an album.
