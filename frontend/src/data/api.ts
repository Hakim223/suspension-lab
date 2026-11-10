const RAW = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
export const API_URL = RAW.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Fetch `{ data }` JSON from the API with a timeout. Throws on network/HTTP errors. */
export async function apiGet<T>(path: string, timeoutMs = 4000, signal?: AbortSignal): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'API URL not configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  signal?.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(`${API_URL}/api${path}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`);
    const body = (await res.json()) as { data: T };
    return body.data;
  } finally {
    clearTimeout(timer);
  }
}
