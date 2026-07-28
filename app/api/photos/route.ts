import { asc, eq } from "drizzle-orm";
import { requirePhotoAdmin } from "../../admin-auth";
import { isGalleryCategory } from "../../photo-types";
import {
  extensionFor,
  getPhotoEnvironment,
  isAllowedImage,
} from "../../photo-storage";
import { getDb } from "../../../db";
import { photos } from "../../../db/schema";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(photos)
      .orderBy(asc(photos.category), asc(photos.sortOrder), asc(photos.createdAt));

    return Response.json(
      { photos: rows },
      { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to load photos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requirePhotoAdmin();
  if (!auth.ok) return auth.response;

  const form = await request.formData();
  const file = form.get("file");
  const category = form.get("category");
  const title = String(form.get("title") ?? "").trim();
  const detail = String(form.get("detail") ?? "").trim();
  const alt = String(form.get("alt") ?? "").trim();
  const featured = form.get("featured") === "true";
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));

  if (!(file instanceof File) || !isAllowedImage(file)) {
    return Response.json(
      { error: "Choose a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: "Images must be smaller than 20 MB." },
      { status: 400 },
    );
  }
  if (!isGalleryCategory(category)) {
    return Response.json({ error: "Choose a portfolio section." }, { status: 400 });
  }
  if (!title || !alt || !Number.isFinite(width) || !Number.isFinite(height)) {
    return Response.json(
      { error: "Title, description, and valid image dimensions are required." },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const storageKey = `portfolio/${id}.${extensionFor(file)}`;
  const src = `/media/${id}`;
  const sortOrder = Date.now();
  const environment = getPhotoEnvironment();

  await environment.PHOTOS.put(storageKey, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  try {
    const db = getDb();
    const [photo] = await db
      .insert(photos)
      .values({
        id,
        storageKey,
        src,
        category,
        title,
        detail,
        alt,
        featured,
        sortOrder,
        width: Math.round(width),
        height: Math.round(height),
      })
      .returning();

    return Response.json({ photo }, { status: 201 });
  } catch (error) {
    await environment.PHOTOS.delete(storageKey);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
