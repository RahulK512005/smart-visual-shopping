export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
export const MIN_SIDE_PX = 128;

/** Cheap checks that need no decoding. Returns an error message, or null if fine. */
export function checkFileBasics(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Please upload a JPG, PNG or WebP image.";
  if (file.size === 0) return "This file is empty. Please choose another image.";
  if (file.size > MAX_BYTES) return "This image is larger than 8 MB. Please upload a smaller one.";
  return null;
}

/** Full check: basics + decodes the image to make sure it opens and is big enough. */
export async function validateImage(file: File): Promise<string | null> {
  const basic = checkFileBasics(file);
  if (basic) return basic;
  const url = URL.createObjectURL(file);
  try {
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
    if (Math.min(dims.w, dims.h) < MIN_SIDE_PX) {
      return `This image is too small (${dims.w}×${dims.h}). Please upload one that is at least ${MIN_SIDE_PX}px on its short side.`;
    }
    return null;
  } catch {
    return "We could not read this image. Please upload a clearer photo.";
  } finally {
    URL.revokeObjectURL(url);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v: string) => EMAIL_RE.test(v.trim());

export function validatePassword(v: string): string | null {
  if (v.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "Include at least one letter and one number.";
  return null;
}
