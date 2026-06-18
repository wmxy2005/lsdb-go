import type { ApiResult, UserInfo } from '@/api/types';
import { apiRequest, setToken } from '@/api/client';
import { CONFIG } from '@/constants';

export async function authLogin(username: string, password: string) {
  return apiRequest<ApiResult<{ token?: string }>>(`${CONFIG.apiUrl}/api/auth/login`, {
    method: 'POST',
    data: { username, password },
    auth: false,
  });
}

export async function authRegister(username: string, password: string) {
  return apiRequest<ApiResult<{ id?: number; username?: string }>>(`${CONFIG.apiUrl}/api/auth/register`, {
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

export async function authChangePassword(oldPassword: string, newPassword: string) {
  return apiRequest<ApiResult<unknown>>(`${CONFIG.apiUrl}/api/auth/password`, {
    method: 'POST',
    data: { oldPassword, newPassword },
  });
}

export async function loginAndStoreToken(username: string, password: string) {
  const res = await authLogin(username, password);
  if (res.success && res.data?.token) {
    setToken(res.data.token);
  }
  return res;
}
