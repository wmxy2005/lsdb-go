import type { ApiResult, PCInfo } from '@/api/types';
import { apiRequest, getToken } from '@/api/client';
import { CONFIG } from '@/constants/config';

export async function openFolder(path: string) {
  return apiRequest<ApiResult<string>>(`${CONFIG.apiUrl}${CONFIG.cmdUrl}opendir`, {
    method: 'POST',
    params: { path },
  });
}

export async function syncFolder(path: string) {
  return apiRequest<ApiResult<string>>(`${CONFIG.apiUrl}${CONFIG.cmdUrl}sync`, {
    method: 'POST',
    params: { path },
  });
}

export async function shutdown(restart: boolean) {
  return apiRequest<ApiResult<string>>(
    `${CONFIG.apiUrl}${CONFIG.cmdUrl}${restart ? 'restart' : 'shutdown'}`,
    { method: 'POST' },
  );
}

export async function getPcStats() {
  return apiRequest<ApiResult<PCInfo>>(`${CONFIG.apiUrl}/api/pc`, { method: 'GET' });
}

export function getPcStatsStreamUrl() {
  const baseUrl = `${CONFIG.apiUrl}/api/pc/stream`;
  const token = getToken();
  if (!token) return baseUrl;
  return `${baseUrl}?token=${encodeURIComponent(token)}`;
}

export function speedTestUrl(type: 'ping' | 'download' | 'upload', bytes?: number) {
  const params = new URLSearchParams();
  if (bytes) params.set('bytes', String(bytes));
  if (type === 'download') params.set('_', String(Date.now()));
  const query = params.toString();
  return `${CONFIG.apiUrl}/api/speedtest/${type}${query ? `?${query}` : ''}`;
}
