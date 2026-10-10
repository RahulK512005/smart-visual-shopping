import { request, tokenStore, wsBase } from "./client";
import type { Api } from "./types";

export const realApi: Api = {
  login: (email, password) => request("/auth/login", { method: "POST", json: { email, password } }),
  register: (name, email, password) => request("/auth/register", { method: "POST", json: { name, email, password } }),
  me: () => request("/auth/me"),

  listProducts: async (q) => {
    const res = await request<{ items: import("../types").Product[] }>(`/products${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    return res.items;
  },

  uploadImage: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/uploads", { method: "POST", form });
  },

  startSimilar: (req) => request("/similar/search", { method: "POST", json: req }),
  startCompat: (req) => request("/compat/check", { method: "POST", json: req }),
  getJob: (id) => request(`/jobs/${encodeURIComponent(id)}`),
  jobSocketUrl: (id) => {
    const t = tokenStore.get();
    return `${wsBase()}/jobs/${encodeURIComponent(id)}${t ? `?token=${encodeURIComponent(t)}` : ""}`;
  },

  adminStats: () => request("/admin/stats"),
  adminReindex: () => request("/admin/reindex", { method: "POST" }),
};
