import { env } from "cloudflare:workers";

type PhotoEnvironment = {
  PHOTOS: R2Bucket;
  ADMIN_EMAIL?: string;
};

export function getPhotoEnvironment(): PhotoEnvironment {
  return env as unknown as PhotoEnvironment;
}

export function isAllowedImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

export function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}
