import type { ApiResult, PageInfo } from '@/api/types';

const PAGE_PREFIX = 'lsdb-items-page:';
const SCROLL_PREFIX = 'lsdb-items-scroll:';
const SEARCH_PREFIX = 'lsdb-items-search:';
const SORT_PREF_KEY = 'lsdb-items-sort';

export type ItemsUrlParams = {
  keyword: string | null;
  category: string | null;
  subcategory: string | null;
  tag: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  matchMode: string | null;
  base: string | null;
  type: string | null;
  favi: string | null;
  sort: string | null;
  page: number;
  pageSize: number;
};

export function getItemsScrollContainer(): HTMLElement | null {
  return document.querySelector('main');
}

export function normalizeItemsSort(sort: string | null | undefined): string | null {
  return sort === 'date' ? sort : null;
}

export function loadItemsSortPreference(): string | null {
  try {
    return normalizeItemsSort(localStorage.getItem(SORT_PREF_KEY));
  } catch {
    return null;
  }
}

export function saveItemsSortPreference(sort: string | null | undefined) {
  const normalized = normalizeItemsSort(sort);
  try {
    if (normalized) localStorage.setItem(SORT_PREF_KEY, normalized);
    else localStorage.removeItem(SORT_PREF_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function resolveItemsParamsWithPreferences(
  params: ItemsUrlParams,
  sortPreference = loadItemsSortPreference(),
): ItemsUrlParams {
  return {
    ...params,
    sort: normalizeItemsSort(params.sort) ?? normalizeItemsSort(sortPreference),
  };
}

export function parseItemsParamsFromSearch(search: string): ItemsUrlParams {
  const sp = new URLSearchParams(search);
  const page = Number(sp.get('page'));
  const pageSize = Number(sp.get('pageSize'));
  return {
    keyword: sp.get('keyword'),
    category: sp.get('category'),
    subcategory: sp.get('subcategory'),
    tag: sp.get('tag'),
    dateFrom: sp.get('dateFrom'),
    dateTo: sp.get('dateTo'),
    matchMode: sp.get('matchMode'),
    base: sp.get('base'),
    type: sp.get('type'),
    favi: sp.get('favi'),
    sort: normalizeItemsSort(sp.get('sort')),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
  };
}

export function buildItemsSearch(params: ItemsUrlParams): string {
  const sp = new URLSearchParams();
  const fields: Array<[string, string | null]> = [
    ['keyword', params.keyword],
    ['category', params.category],
    ['subcategory', params.subcategory],
    ['tag', params.tag],
    ['dateFrom', params.dateFrom],
    ['dateTo', params.dateTo],
    ['matchMode', params.matchMode],
    ['base', params.base],
    ['type', params.type],
    ['favi', params.favi],
    ['sort', normalizeItemsSort(params.sort)],
  ];
  for (const [key, value] of fields) {
    if (value != null && value !== '') sp.set(key, value);
  }
  if (params.page !== 1) sp.set('page', String(params.page));
  if (params.pageSize !== 20) sp.set('pageSize', String(params.pageSize));
  const query = sp.toString();
  return query ? `?${query}` : '';
}

export function itemsParamsToApiParams(params: ItemsUrlParams) {
  return {
    keyword: params.keyword ?? undefined,
    category: params.category ?? undefined,
    subcategory: params.subcategory ?? undefined,
    tag: params.tag ?? undefined,
    dateFrom: params.dateFrom ?? undefined,
    dateTo: params.dateTo ?? undefined,
    matchMode: params.matchMode ?? undefined,
    base: params.base ?? undefined,
    type: params.type ?? undefined,
    favi: params.favi ?? undefined,
    sort: normalizeItemsSort(params.sort) ?? undefined,
    page: String(params.page),
    pageSize: String(params.pageSize),
  };
}

export function loadItemsPageCache(
  locationKey: string,
  search = '',
): ApiResult<PageInfo> | undefined {
  try {
    const cachedSearch = localStorage.getItem(SEARCH_PREFIX + locationKey);
    if (cachedSearch !== search) return undefined;
    const raw = localStorage.getItem(PAGE_PREFIX + locationKey);
    if (!raw || raw === 'undefined') return undefined;
    const parsed = JSON.parse(raw) as ApiResult<PageInfo>;
    return parsed?.success ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveItemsPageCache(
  locationKey: string,
  data: ApiResult<PageInfo>,
  search = '',
) {
  if (!data.success) return;
  try {
    localStorage.setItem(PAGE_PREFIX + locationKey, JSON.stringify(data));
    localStorage.setItem(SEARCH_PREFIX + locationKey, search);
  } catch {
    // localStorage full or unavailable
  }
}

// One-shot in-memory seed: lets a fresh navigation reuse data already fetched
// elsewhere (e.g. the command-menu search) instead of re-calling the API.
// Keyed by the exact `location.search` string the items page will see.
let pendingSeed: { search: string; data: ApiResult<PageInfo> } | null = null;

export function seedItemsPageData(search: string, data: ApiResult<PageInfo>) {
  if (!data.success) return;
  pendingSeed = { search, data };
}

export function takeItemsPageSeed(
  search: string,
): ApiResult<PageInfo> | undefined {
  if (pendingSeed?.search === search) {
    const { data } = pendingSeed;
    pendingSeed = null; // consume once
    return data;
  }
  return undefined;
}

export type ItemsScrollState = {
  top: number;
  ratio: number;
};

export function getItemsMaxScroll(container: HTMLElement): number {
  return Math.max(0, container.scrollHeight - container.clientHeight);
}

export function loadItemsScrollState(locationKey: string): ItemsScrollState {
  try {
    const raw = localStorage.getItem(SCROLL_PREFIX + locationKey);
    if (raw == null) return { top: 0, ratio: 0 };
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw) as Partial<ItemsScrollState>;
      const top = Number(parsed.top);
      const ratio = Number(parsed.ratio);
      return {
        top: Number.isFinite(top) ? top : 0,
        ratio: Number.isFinite(ratio) ? ratio : 0,
      };
    }
    const top = Number(raw);
    return { top: Number.isFinite(top) ? top : 0, ratio: 0 };
  } catch {
    return { top: 0, ratio: 0 };
  }
}

export function loadItemsScroll(locationKey: string): number {
  return loadItemsScrollState(locationKey).top;
}

export function saveItemsScroll(
  locationKey: string,
  scrollTop: number,
  ratio = 0,
) {
  try {
    const state: ItemsScrollState = {
      top: scrollTop,
      ratio: Number.isFinite(ratio) ? ratio : 0,
    };
    localStorage.setItem(SCROLL_PREFIX + locationKey, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearItemsPageCacheOnUnload() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key?.startsWith(PAGE_PREFIX) ||
      key?.startsWith(SCROLL_PREFIX) ||
      key?.startsWith(SEARCH_PREFIX)
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
