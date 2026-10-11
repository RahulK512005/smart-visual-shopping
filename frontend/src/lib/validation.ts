import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from "./config";

/** Returns an error message, or null when the file is acceptable. */
export function validateImageFile(file: { type: string; size: number; name?: string }): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return "This file type isn't supported. Upload a JPG, PNG or WebP image.";
  }
  if (file.size === 0) return "This file is empty. Choose a different image.";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `This image is larger than ${MAX_UPLOAD_MB} MB. Choose a smaller file.`;
  }
  return null;
}
