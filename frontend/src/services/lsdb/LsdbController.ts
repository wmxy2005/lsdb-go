import { CONFIG } from '@/constants';
import { apiRequest, getToken } from './client';

export async function authLogin(
  params: {},
  values: { username: string; password: string },
) {
  return apiRequest<LSDB.Result_Login__>(CONFIG.apiUrl + '/api/auth/login', {
    method: 'POST',
    data: {
      username: values.username,
      password: values.password,
    },
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
}

export async function authLogout() {
  return apiRequest<LSDB.Result_string_>(CONFIG.apiUrl + '/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function authCurrent(
  params: {},
  options?: { [key: string]: any },
) {
  return apiRequest<LSDB.Result_UserInfo__>(
    CONFIG.apiUrl + '/api/auth/current',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    },
  );
}

export async function queryItemList(
  params: {},
  options?: { [key: string]: any },
) {
  return apiRequest<LSDB.Result_PageInfo_ITEMInfo__>(
    CONFIG.apiUrl + '/api/items',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    },
  );
}

export async function queryItem(
  itemId: number,
  options?: { [key: string]: any },
) {
  return apiRequest<LSDB.Result_ITEMInfo__>(
    CONFIG.apiUrl + CONFIG.detailUrl + itemId,
    {
      method: 'GET',
      params: {},
      ...(options || {}),
    },
  );
}

export async function newItem(data: any) {
  return apiRequest<LSDB.Result_string_>(CONFIG.apiUrl + CONFIG.detailUrl, {
    method: 'POST',
    data: {
      ...data,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function updateItem(itemId: number, data: any) {
  return apiRequest<LSDB.Result_string_>(
    CONFIG.apiUrl + CONFIG.detailUrl + itemId,
    {
      method: 'PUT',
      data: {
        ...data,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

export async function queryRole(
  roleId: number,
  options?: { [key: string]: any },
) {
  return apiRequest<LSDB.Result_ROLEInfo__>(
    CONFIG.apiUrl + CONFIG.roleUrl + roleId,
    {
      method: 'GET',
      ...(options || {}),
    },
  );
}

export async function faviItem(itemId: number, expired: number) {
  return apiRequest<LSDB.Result_string_>(
    CONFIG.apiUrl + CONFIG.faviUrl.replace(':id', itemId.toString()),
    {
      method: expired ? 'DELETE' : 'POST',
    },
  );
}

export async function openFolder(path: string) {
  return apiRequest<LSDB.Result_string_>(
    CONFIG.apiUrl + CONFIG.cmdUrl + 'opendir',
    {
      method: 'POST',
      params: {
        path,
      },
    },
  );
}

export async function shutdown(restart: boolean) {
  return apiRequest<LSDB.Result_string_>(
    CONFIG.apiUrl + CONFIG.cmdUrl + (restart ? 'restart' : 'shutdown'),
    {
      method: 'POST',
    },
  );
}

export async function getPcStats() {
  return apiRequest<LSDB.Result_PCInfo__>(CONFIG.apiUrl + '/api/pc', {
    method: 'GET',
  });
}

export function getPcStatsStreamUrl() {
  const baseUrl = CONFIG.apiUrl + '/api/pc/stream';
  const token = getToken();
  if (!token) {
    return baseUrl;
  }

  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(
    token,
  )}`;
}

export function speedTestUrl(
  type: 'ping' | 'download' | 'upload',
  bytes?: number,
) {
  const params = new URLSearchParams();
  if (bytes) {
    params.set('bytes', String(bytes));
  }
  if (type === 'download') {
    params.set('_', String(Date.now()));
  }

  const query = params.toString();
  return `${CONFIG.apiUrl}/api/speedtest/${type}${query ? `?${query}` : ''}`;
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
