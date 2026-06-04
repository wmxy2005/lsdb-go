import { CONFIG } from '@/constants';
import { request, RequestOptions } from '@umijs/max';

const TOKEN_KEY = 'lsdb_token';

export function getToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const tokenCookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${TOKEN_KEY}=`))
    ?.slice(TOKEN_KEY.length + 1);

  return tokenCookie ? decodeURIComponent(tokenCookie) : null;
}

export function setToken(token: string | null): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (token) {
    const maxAge = Math.floor(CONFIG.tokenExpired / 1000);
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(
      token,
    )}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export class ApiError extends Error {
  status: number;
  errorCode: number;

  constructor(message: string, status: number, errorCode: number) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    params,
    data,
    auth = true,
    withCredentials,
  } = options;
  const headers: Record<string, string> = {};
  if (data !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return request<T>(path, {
    method,
    params,
    data,
    headers,
    withCredentials,
  });
}
