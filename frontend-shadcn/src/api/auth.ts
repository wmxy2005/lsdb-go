import type { ApiResult, UserInfo } from '@/api/types';
import { apiRequest, setToken } from '@/api/client';
import { CONFIG } from '@/constants/config';

export async function authLogin(username: string, password: string) {
  return apiRequest<ApiResult<{ token?: string }>>(`${CONFIG.apiUrl}/api/auth/login`, {
    method: 'POST',
    data: { username, password },
    auth: false,
  });
}

export async function authLogout() {
  return apiRequest<ApiResult<string>>(`${CONFIG.apiUrl}/api/auth/logout`, {
    method: 'POST',
  });
}

export async function authCurrent() {
  return apiRequest<ApiResult<UserInfo>>(`${CONFIG.apiUrl}/api/auth/current`, {
    method: 'GET',
  });
}

export async function loginAndStoreToken(username: string, password: string) {
  const res = await authLogin(username, password);
  if (res.success && res.data?.token) {
    setToken(res.data.token);
  }
  return res;
}
