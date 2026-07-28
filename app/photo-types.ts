export type GalleryCategory = "travel" | "events" | "sports";

export type PortfolioPhoto = {
  id: string;
  src: string;
  category: GalleryCategory;
  title: string;
  detail: string;
  alt: string;
  featured: boolean;
  sortOrder: number;
  width: number;
  height: number;
};

export function isGalleryCategory(value: unknown): value is GalleryCategory {
  return value === "travel" || value === "events" || value === "sports";
}
