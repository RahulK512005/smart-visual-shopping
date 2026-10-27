export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")
    ? "https://smart-visual-backend.onrender.com"
    : "http://localhost:8000")
).replace(/\/+$/, "");
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 10);
export const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 60000);
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
