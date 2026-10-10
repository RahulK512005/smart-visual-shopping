import { ApiError } from "./client";
import { api } from "./index";
import type { Job } from "../types";

const POLL_MS = 900;
const TIMEOUT_MS = 120_000;
const isFinal = (j: Job) => j.status === "done" || j.status === "failed";

/**
 * Follow a backend job until it finishes.
 * Tries the WebSocket first (live status); if that is unavailable or drops, falls back to polling.
 * Returns a promise for the final job and a cancel() function.
 */
export function watchJob<T>(jobId: string, onUpdate: (job: Job<T>) => void) {
  let cancelled = false;
  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let polling = false;
  const startedAt = Date.now();

  const cancel = () => {
    cancelled = true;
    if (pollTimer) clearTimeout(pollTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  };

  const done = new Promise<Job<T>>((resolve, reject) => {
    const finish = (job: Job<T>) => {
      cancel();
      resolve(job);
    };

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > TIMEOUT_MS) {
        cancel();
        reject(new ApiError(0, "TIMEOUT", "This is taking longer than expected. Please try again."));
        return;
      }
      try {
        const job = await api.getJob<T>(jobId);
        if (cancelled) return;
        onUpdate(job);
        if (isFinal(job)) return finish(job);
      } catch (e) {
        cancel();
        return reject(e);
      }
      pollTimer = setTimeout(poll, POLL_MS);
    };

    const startPolling = () => {
      if (polling || cancelled) return;
      polling = true;
      poll();
    };

    const url = api.jobSocketUrl(jobId);
    if (!url || typeof WebSocket === "undefined") {
      startPolling();
      return;
    }

    try {
      ws = new WebSocket(url);
    } catch {
      startPolling();
      return;
    }
    ws.onmessage = (ev) => {
      try {
        const job = JSON.parse(ev.data) as Job<T>;
        onUpdate(job);
        if (isFinal(job)) finish(job);
      } catch {
        /* ignore malformed frame */
      }
    };
    // Socket failed or closed early → keep going with polling so the user never gets stuck.
    ws.onerror = startPolling;
    ws.onclose = startPolling;
  });

  return { done, cancel };
}
