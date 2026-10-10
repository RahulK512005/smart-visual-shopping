import type {
  AdminStats, AuthResponse, CompatRequest, Job, Product, SimilarRequest, UploadedImage, User,
} from "../types";

/** Everything the UI needs from a backend. Implemented by real.ts (FastAPI) and mock.ts (fake data). */
export interface Api {
  login(email: string, password: string): Promise<AuthResponse>;
  register(name: string, email: string, password: string): Promise<AuthResponse>;
  me(): Promise<User>;

  listProducts(q?: string): Promise<Product[]>;
  uploadImage(file: File): Promise<UploadedImage>;

  startSimilar(req: SimilarRequest): Promise<{ job_id: string }>;
  startCompat(req: CompatRequest): Promise<{ job_id: string }>;
  getJob<T = unknown>(jobId: string): Promise<Job<T>>;
  /** null = no WebSocket available (mock) → the UI polls instead. */
  jobSocketUrl(jobId: string): string | null;

  adminStats(): Promise<AdminStats>;
  adminReindex(): Promise<{ job_id: string }>;
}
