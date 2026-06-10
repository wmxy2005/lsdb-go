import { authHeaders } from '@/api/client';
import type { ApiResult } from '@/api/types';
import { CONFIG } from '@/constants';

type ResourcePath = {
  base: string;
  category: string;
  subcategory: string;
  name: string;
  filename: string;
};

function resourceQuery(path: ResourcePath) {
  return new URLSearchParams({
    base: path.base ?? '',
    category: path.category ?? '',
    subcategory: path.subcategory ?? '',
    name: path.name ?? '',
    filename: path.filename ?? '',
  });
}

export async function uploadResource(path: ResourcePath, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${CONFIG.apiUrl}/api/resource?${resourceQuery(path)}`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
    credentials: 'include',
  });
  return res.json() as Promise<ApiResult<string>>;
}

export async function deleteResource(path: ResourcePath) {
  const res = await fetch(`${CONFIG.apiUrl}/api/resource?${resourceQuery(path)}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  return res.json() as Promise<ApiResult<string>>;
}
