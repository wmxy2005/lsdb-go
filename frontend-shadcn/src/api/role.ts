import type { ApiResult, RoleInfo } from '@/api/types';
import { apiRequest } from '@/api/client';
import { CONFIG } from '@/constants';

export async function queryRole(roleId: number) {
  return apiRequest<ApiResult<RoleInfo>>(`${CONFIG.apiUrl}${CONFIG.roleUrl}${roleId}`, {
    method: 'GET',
  });
}
