import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  code?: string;
  requestId?: string;
  readonly status: number;
  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (code) this.code = code;
    if (requestId) this.requestId = requestId;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const source = await response.text();
  let body: T & { error?: string; code?: string; requestId?: string };
  try {
    body = (source ? JSON.parse(source) : {}) as T & { error?: string; code?: string; requestId?: string };
  } catch {
    throw new ApiError("서버 응답 형식을 확인할 수 없습니다.", response.status, "INVALID_SERVER_RESPONSE");
  }
  if (!response.ok) {
    if (body.code === "GIT_AUTH_REQUIRED" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("skillroster:git-auth-required"));
    }
    throw new ApiError(body.error ?? `요청에 실패했습니다. (${response.status})`, response.status, body.code, body.requestId);
  }
  return body;
}

export function useApi<T>(url: string, interval = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const next = await fetchJson<T>(url);
      setData(next);
      setError(null);
      setErrorCode(null);
      setRequestId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setErrorCode(caught instanceof ApiError ? caught.code ?? null : null);
      setRequestId(caught instanceof ApiError ? caught.requestId ?? null : null);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
    if (!interval) return;
    const timer = window.setInterval(() => void reload(), interval);
    return () => window.clearInterval(timer);
  }, [interval, reload]);

  return { data, error, errorCode, requestId, loading, reload };
}
