"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export type AsyncState<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

/** Runs an API call on mount (and on reload). Cancels in-flight requests on unmount. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    fnRef.current(controller.signal).then(
      (data) => setState({ status: "ready", data }),
      (e) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", error: e instanceof ApiError ? e.message : "Something went wrong. Try again." });
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { state, reload: useCallback(() => setNonce((n) => n + 1), []) };
}
