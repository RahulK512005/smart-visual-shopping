import { USE_MOCK } from "./client";
import { mockApi } from "./mock";
import { realApi } from "./real";
import type { Api } from "./types";

export const api: Api = USE_MOCK ? mockApi : realApi;
export { USE_MOCK };
