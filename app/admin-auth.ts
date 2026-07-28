import { getChatGPTUser } from "./chatgpt-auth";
import { getPhotoEnvironment } from "./photo-storage";

export async function requirePhotoAdmin() {
  const user = await getChatGPTUser();
  const adminEmail = getPhotoEnvironment().ADMIN_EMAIL?.trim().toLowerCase();

  if (!user) {
    return {
      ok: false as const,
      response: Response.json({ error: "Sign in is required." }, { status: 401 }),
    };
  }

  if (!adminEmail || user.email.toLowerCase() !== adminEmail) {
    return {
      ok: false as const,
      response: Response.json({ error: "You do not have access to the photo manager." }, { status: 403 }),
    };
  }

  return { ok: true as const, user };
}
