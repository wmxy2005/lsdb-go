import { CONFIG } from '@/constants/config';

const TOKEN_KEY = 'lsdb_token';

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const tokenCookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${TOKEN_KEY}=`))
    ?.slice(TOKEN_KEY.length + 1);
  return tokenCookie ? decodeURIComponent(tokenCookie) : null;
}

export function setToken(token: string | null): void {
  if (typeof document === 'undefined') return;
  if (token) {
    const maxAge = Math.floor(CONFIG.tokenExpired / 1000);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type ApiRequestOptions = {
  method?: string;
  params?: Record<string, string | number | boolean | undefined>;
  data?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
};

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', params, data, auth = true, headers: optionHeaders } = options;
  const headers: Record<string, string> = { ...optionHeaders };
  if (data !== undefined && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    Object.assign(headers, authHeaders());
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers,
    credentials: 'include',
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return {} as T;
  }

  if (body && typeof body === 'object' && 'success' in body) {
    return body as T;
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return body as T;
}
