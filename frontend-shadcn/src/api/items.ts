import type { ApiResult, ItemInfo, ItemSearchParams, PageInfo } from '@/api/types';
import { apiRequest } from '@/api/client';
import { CONFIG } from '@/constants/config';

export async function queryItemList(params: ItemSearchParams) {
  return apiRequest<ApiResult<PageInfo>>(`${CONFIG.apiUrl}/api/items`, {
    method: 'GET',
    params: params as Record<string, string | undefined>,
  });
}

export async function queryItem(itemId: number) {
  return apiRequest<ApiResult<ItemInfo>>(`${CONFIG.apiUrl}${CONFIG.detailUrl}${itemId}`, {
    method: 'GET',
  });
}

export async function newItem(data: Record<string, unknown>) {
  return apiRequest<ApiResult<string>>(`${CONFIG.apiUrl}${CONFIG.detailUrl}`, {
    method: 'POST',
    data,
  });
}

export async function updateItem(itemId: number, data: Record<string, unknown>) {
  return apiRequest<ApiResult<string>>(`${CONFIG.apiUrl}${CONFIG.detailUrl}${itemId}`, {
    method: 'PUT',
    data,
  });
}

export async function faviItem(itemId: number, remove: boolean) {
  return apiRequest<ApiResult<string>>(
    `${CONFIG.apiUrl}/api/items/${itemId}/favorite`,
    { method: remove ? 'DELETE' : 'POST' },
  );
}
