import { useCallback, useEffect, useRef, useState } from "react";
import { watchJob } from "../api/jobs";
import { ApiError } from "../api/client";
import { friendlyError } from "../utils/format";
import type { Job } from "../types";

export interface RunState<T> {
  phase: "idle" | "running" | "done" | "error";
  stage?: string;
  progress?: number;
  result?: T;
  error?: string;
}

/**
 * Starts a backend job and tracks it: idle → running (with live stage) → done | error.
 * `start` may do other async work first (e.g. upload an image) and must return { job_id }.
 */
export function useJobRunner<T>() {
  const [state, setState] = useState<RunState<T>>({ phase: "idle" });
  const cancelRef = useRef<(() => void) | null>(null);
  const runId = useRef(0);

  const cancel = useCallback(() => {
    runId.current += 1;
    cancelRef.current?.();
    cancelRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const run = useCallback(
    async (start: (setStage: (s: string) => void) => Promise<{ job_id: string }>) => {
      cancel();
      const myRun = runId.current;
      const alive = () => runId.current === myRun;
      setState({ phase: "running", stage: "uploading" });
      try {
        const { job_id } = await start((stage) => alive() && setState({ phase: "running", stage }));
        if (!alive()) return;
        const { done, cancel: stop } = watchJob<T>(job_id, (job: Job<T>) => {
          if (alive() && job.status !== "done" && job.status !== "failed") {
            setState({ phase: "running", stage: job.stage, progress: job.progress });
          }
        });
        cancelRef.current = stop;
        const job = await done;
        if (!alive()) return;
        if (job.status === "failed") {
          setState({ phase: "error", error: friendlyError(job.error_code, job.message) });
        } else {
          setState({ phase: "done", result: job.result });
        }
      } catch (e) {
        if (!alive() || (e as Error).name === "AbortError") return;
        const err = e as ApiError;
        setState({ phase: "error", error: friendlyError(err.code, err.message) });
      }
    },
    [cancel],
  );

  const reset = useCallback(() => {
    cancel();
    setState({ phase: "idle" });
  }, [cancel]);

  return { state, run, reset };
}
