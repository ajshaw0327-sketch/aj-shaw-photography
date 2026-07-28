import { eq } from "drizzle-orm";
import { requirePhotoAdmin } from "../../../admin-auth";
import { isGalleryCategory } from "../../../photo-types";
import {
  extensionFor,
  getPhotoEnvironment,
  isAllowedImage,
} from "../../../photo-storage";
import { getDb } from "../../../../db";
import { photos } from "../../../../db/schema";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const auth = await requirePhotoAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getDb();
  const [existing] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!existing) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }

  const form = await request.formData();
  const fileValue = form.get("file");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const category = form.get("category");
  const title = String(form.get("title") ?? "").trim();
  const detail = String(form.get("detail") ?? "").trim();
  const alt = String(form.get("alt") ?? "").trim();
  const featured = form.get("featured") === "true";
  const width = Number(form.get("width") ?? existing.width);
  const height = Number(form.get("height") ?? existing.height);

  if (!isGalleryCategory(category) || !title || !alt) {
    return Response.json(
      { error: "Section, title, and image description are required." },
      { status: 400 },
    );
  }
  if (
    file &&
    (!isAllowedImage(file) || file.size > MAX_UPLOAD_BYTES)
  ) {
    return Response.json(
      { error: "Replacement images must be JPG, PNG, or WebP and under 20 MB." },
      { status: 400 },
    );
  }

  const environment = getPhotoEnvironment();
  const newStorageKey = file
    ? `portfolio/${id}-${Date.now()}.${extensionFor(file)}`
    : existing.storageKey;

  if (file && newStorageKey) {
    await environment.PHOTOS.put(newStorageKey, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }

  try {
    const [photo] = await db
      .update(photos)
      .set({
        storageKey: newStorageKey,
        src: file ? `/media/${id}?v=${Date.now()}` : existing.src,
        category,
        title,
        detail,
        alt,
        featured,
        width: Math.round(width),
        height: Math.round(height),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(photos.id, id))
      .returning();

    if (file && existing.storageKey && existing.storageKey !== newStorageKey) {
      await environment.PHOTOS.delete(existing.storageKey);
    }

    return Response.json({ photo });
  } catch (error) {
    if (file && newStorageKey && newStorageKey !== existing.storageKey) {
      await environment.PHOTOS.delete(newStorageKey);
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requirePhotoAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = getDb();
  const [existing] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  if (!existing) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }

  await db.delete(photos).where(eq(photos.id, id));
  if (existing.storageKey) {
    await getPhotoEnvironment().PHOTOS.delete(existing.storageKey);
  }

  return Response.json({ ok: true });
}
