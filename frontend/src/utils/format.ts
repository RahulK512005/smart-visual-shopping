export function formatPrice(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export const percent = (score: number) => `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`;

/** Plain-language messages for backend error codes (see docs/API_CONTRACT.md). */
const FRIENDLY: Record<string, string> = {
  IMAGE_UNREADABLE: "We could not read this image. Please upload a clearer photo.",
  IMAGE_TOO_SMALL: "This image is too small. Please upload a larger one.",
  UNSUPPORTED_FILE: "Please upload a JPG, PNG or WebP image.",
  NO_MATCH: "We could not find a close match in this demo catalog.",
  PRODUCT_NOT_FOUND: "We could not find that product. Please pick another.",
  INVALID_INPUT: "Some details are missing. Please check the form and try again.",
  MODEL_UNAVAILABLE: "The image model is not ready yet. Please try again in a moment.",
  TIMEOUT: "This is taking longer than expected. Please try again.",
  NETWORK: "We could not reach the server. Check your connection and try again.",
  INVALID_CREDENTIALS: "Email or password is incorrect.",
  EMAIL_TAKEN: "An account with this email already exists.",
};

export function friendlyError(code?: string, message?: string): string {
  if (code && FRIENDLY[code]) return FRIENDLY[code];
  return message && message.length < 160 ? message : "We could not finish this. Please try again.";
}

export const STAGE_LABEL: Record<string, string> = {
  uploading: "Uploading your image",
  embedding: "Reading your image",
  searching: "Searching the catalog",
  ranking: "Ranking the best matches",
  analysing: "Looking at your item",
  checking_rules: "Checking compatibility rules",
  vision_check: "Checking details in the photo",
  indexing: "Updating the search index",
};
export const stageLabel = (s?: string) => (s ? STAGE_LABEL[s] ?? "Working on it" : "Getting started");
