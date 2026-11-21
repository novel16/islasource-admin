"use client";

import { useEffect, useReducer, useState } from "react";
import { useAuth } from "./auth-provider";
import { ApiError } from "@/lib/api";

export function useApiResource<T>(path: string | null) {
  const { request, status } = useAuth();
  const [attempt, retry] = useReducer((value: number) => value + 1, 0);
  const [result, setResult] = useState<{
    path: string;
    attempt: number;
    data: T | null;
    error: ApiError | null;
  } | null>(null);
  useEffect(() => {
    if (!path || status !== "authenticated") return;
    const controller = new AbortController();
    request<T>(path, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted)
          setResult({ path, attempt, data, error: null });
      },
      (failure) => {
        if (!controller.signal.aborted)
          setResult({
            path,
            attempt,
            data: null,
            error:
              failure instanceof ApiError
                ? failure
                : new ApiError(
                    0,
                    "We couldn’t load these records. Please try again.",
                  ),
          });
      },
    );
    return () => controller.abort();
  }, [path, attempt, request, status]);
  const current =
    result?.path === path && result.attempt === attempt ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: Boolean(path) && !current,
    retry,
  };
}
