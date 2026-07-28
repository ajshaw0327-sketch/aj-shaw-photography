"use client";

import { FormEvent, useEffect, useState } from "react";
import type { GalleryCategory, PortfolioPhoto } from "../photo-types";

const categoryLabels: Record<GalleryCategory, string> = {
  travel: "Travel & Street",
  events: "Events",
  sports: "Sports",
};

type UploadDraft = {
  category: GalleryCategory;
  title: string;
  detail: string;
  alt: string;
  featured: boolean;
};

const emptyUpload: UploadDraft = {
  category: "travel",
  title: "",
  detail: "",
  alt: "",
  featured: false,
};

async function imageDimensions(file: File) {
  const bitmap = await createImageBitmap(file);
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

function appendPhotoFields(
  form: FormData,
  fields: UploadDraft,
  dimensions?: { width: number; height: number },
) {
  form.set("category", fields.category);
  form.set("title", fields.title);
  form.set("detail", fields.detail);
  form.set("alt", fields.alt);
  form.set("featured", String(fields.featured));
  if (dimensions) {
    form.set("width", String(dimensions.width));
    form.set("height", String(dimensions.height));
  }
}

export default function PhotoManager({ displayName }: { displayName: string }) {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [upload, setUpload] = useState<UploadDraft>(emptyUpload);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading the archive…");

  const loadPhotos = async () => {
    const response = await fetch("/api/photos", { cache: "no-store" });
    const payload = (await response.json()) as {
      photos?: PortfolioPhoto[];
      error?: string;
    };
    if (!response.ok || !payload.photos) {
      throw new Error(payload.error ?? "Could not load the archive.");
    }
    setPhotos(payload.photos);
    setMessage(`${payload.photos.length} photographs in the live portfolio.`);
  };

  useEffect(() => {
    loadPhotos().catch((error: Error) => setMessage(error.message));
  }, []);

  const uploadPhoto = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a photograph first.");
      return;
    }

    setBusy(true);
    setMessage("Uploading and preparing the photograph…");
    try {
      const dimensions = await imageDimensions(file);
      const form = new FormData();
      form.set("file", file);
      appendPhotoFields(form, upload, dimensions);

      const response = await fetch("/api/photos", { method: "POST", body: form });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");

      setUpload(emptyUpload);
      setFile(null);
      const input = event.currentTarget.elements.namedItem(
        "photo-file",
      ) as HTMLInputElement | null;
      if (input) input.value = "";
      await loadPhotos();
      setMessage("Photograph published. The portfolio has already updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="manager-shell">
      <header className="manager-header">
        <div>
          <p className="kicker">AJ Shaw / private workspace</p>
          <h1>Photo manager</h1>
          <p>
            Signed in as {displayName}. Upload, replace, recategorize, feature,
            or remove photographs—the public pages rearrange themselves.
          </p>
        </div>
        <a className="button button-primary" href="/">
          View live portfolio ↗
        </a>
      </header>

      <section className="manager-card upload-card" aria-labelledby="upload-title">
        <div>
          <p className="kicker">Add a new frame</p>
          <h2 id="upload-title">Upload a photograph</h2>
          <p>JPG, PNG, or WebP up to 20 MB. Portrait and landscape sizes are detected automatically.</p>
        </div>
        <form onSubmit={uploadPhoto}>
          <label className="file-drop">
            <span>{file ? file.name : "Choose a photograph"}</span>
            <small>Click to browse your device</small>
            <input
              name="photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
            />
          </label>
          <label>
            Portfolio section
            <select
              value={upload.category}
              onChange={(event) =>
                setUpload({ ...upload, category: event.target.value as GalleryCategory })
              }
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              value={upload.title}
              onChange={(event) => setUpload({ ...upload, title: event.target.value })}
              placeholder="A short photograph title"
              required
            />
          </label>
          <label>
            Location or event details
            <input
              value={upload.detail}
              onChange={(event) => setUpload({ ...upload, detail: event.target.value })}
              placeholder="Location · Month 2026"
            />
          </label>
          <label className="manager-wide">
            Image description
            <textarea
              value={upload.alt}
              onChange={(event) => setUpload({ ...upload, alt: event.target.value })}
              placeholder="Describe what is visible for people using screen readers"
              required
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={upload.featured}
              onChange={(event) => setUpload({ ...upload, featured: event.target.checked })}
            />
            Show on the homepage
          </label>
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "Publishing…" : "Publish photograph"}
          </button>
        </form>
      </section>

      <div className="manager-status" role="status">{message}</div>

      <section className="manager-archive" aria-labelledby="archive-manager-title">
        <div className="manager-section-heading">
          <div>
            <p className="kicker">Live archive</p>
            <h2 id="archive-manager-title">Edit existing work</h2>
          </div>
          <p>Replace an image without losing its caption, or change any detail and save.</p>
        </div>
        <div className="manager-photo-list">
          {photos.map((photo) => (
            <PhotoEditor key={photo.id} photo={photo} onChanged={loadPhotos} setMessage={setMessage} />
          ))}
        </div>
      </section>
    </main>
  );
}

function PhotoEditor({
  photo,
  onChanged,
  setMessage,
}: {
  photo: PortfolioPhoto;
  onChanged: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  const [draft, setDraft] = useState<UploadDraft>({
    category: photo.category,
    title: photo.title,
    detail: photo.detail,
    alt: photo.alt,
    featured: photo.featured,
  });
  const [replacement, setReplacement] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(`Saving ${draft.title}…`);
    try {
      const form = new FormData();
      appendPhotoFields(
        form,
        draft,
        replacement ? await imageDimensions(replacement) : { width: photo.width, height: photo.height },
      );
      if (replacement) form.set("file", replacement);

      const response = await fetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        body: form,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Update failed.");
      setReplacement(null);
      await onChanged();
      setMessage(`${draft.title} is updated on the live portfolio.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove “${photo.title}” from the portfolio?`)) return;
    setBusy(true);
    setMessage(`Removing ${photo.title}…`);
    try {
      const response = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Delete failed.");
      await onChanged();
      setMessage(`${photo.title} was removed from the portfolio.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="manager-photo">
      <img src={photo.src} alt="" />
      <form onSubmit={save}>
        <div className="manager-photo-meta">
          <label>
            Section
            <select
              value={draft.category}
              onChange={(event) => setDraft({ ...draft, category: event.target.value as GalleryCategory })}
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
          </label>
          <label>
            Details
            <input value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} />
          </label>
          <label>
            Image description
            <textarea value={draft.alt} onChange={(event) => setDraft({ ...draft, alt: event.target.value })} required />
          </label>
        </div>
        <div className="manager-photo-actions">
          <label className="replace-label">
            <span>{replacement ? replacement.name : "Replace image"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setReplacement(event.target.files?.[0] ?? null)}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => setDraft({ ...draft, featured: event.target.checked })}
            />
            Homepage
          </label>
          <button className="button button-primary" type="submit" disabled={busy}>Save changes</button>
          <button className="manager-delete" type="button" onClick={remove} disabled={busy}>Remove</button>
        </div>
      </form>
    </article>
  );
}
