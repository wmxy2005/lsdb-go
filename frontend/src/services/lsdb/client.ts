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

export function apiMessage(res: { message?: string; errorMessage?: string }) {
  return res?.message || res?.errorMessage || 'Failed';
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

type ApiRequestOptions = RequestOptions & {
  auth?: boolean;
};

async function readErrorResponse(error: any) {
  if (error?.data !== undefined) {
    return error.data;
  }

  const response = error?.response;
  if (!response) {
    return undefined;
  }

  if (typeof response.clone === 'function') {
    return response.clone().json();
  }

  if (typeof response.json === 'function') {
    return response.json();
  }

  return undefined;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    params,
    data,
    auth = true,
    withCredentials,
    headers: optionHeaders,
    ...requestOptions
  } = options;
  const headers: Record<string, string> = {};
  if (data !== undefined && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    return await request<T>(path, {
      ...requestOptions,
      method,
      params,
      data,
      headers: {
        ...(optionHeaders as Record<string, string> | undefined),
        ...headers,
      },
      withCredentials,
    });
  } catch (error: any) {
    const data = await readErrorResponse(error);
    if (data && typeof data === 'object' && 'success' in data) {
      return data as T;
    }

    throw error;
  }
}
