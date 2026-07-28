import { eq } from "drizzle-orm";
import { getPhotoEnvironment } from "../../photo-storage";
import { getDb } from "../../../db";
import { photos } from "../../../db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const [photo] = await db
    .select({ storageKey: photos.storageKey })
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);

  if (!photo?.storageKey) {
    return new Response("Image not found", { status: 404 });
  }

  const object = await getPhotoEnvironment().PHOTOS.get(photo.storageKey);
  if (!object) {
    return new Response("Image not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(object.body, { headers });
}
