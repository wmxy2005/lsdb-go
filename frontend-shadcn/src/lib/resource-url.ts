import { CONFIG, DIR_SEP } from '@/constants';

export function resolvePath(
  resBase: string | undefined,
  base: string,
  category: string,
  subcategory: string,
  name: string,
  filename: string,
) {
  const parts: string[] = [];
  if (resBase?.trim()) parts.push(resBase.trim());
  for (const segment of [base, category, subcategory, name, filename]) {
    if (segment?.trim()) parts.push(segment.trim());
  }
  return parts.join(DIR_SEP);
}

export function resolveUrl(
  base: string,
  category: string,
  subcategory: string,
  name: string,
  filename: string,
  options?: { force?: boolean },
) {
  const params = new URLSearchParams({
    base: base ?? '',
    category: category ?? '',
    subcategory: subcategory ?? '',
    name: name ?? '',
    filename: filename ?? '',
  });
  if (options?.force ?? true) {
    params.set('force', 'true');
  }
  return `${CONFIG.apiUrl}/api/resource?${params.toString()}`;
}

export function resolveSearchParamUrl(params: Record<string, unknown>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  return search.toString();
}

export function resolveTagUrl(
  tagType: string,
  tag: string,
  searchInfo?: { sort?: string },
) {
  const param: Record<string, string> = {};
  let paramName = 'tag';
  if (tagType === 'base') paramName = 'base';
  else if (tagType === 'category') paramName = 'category';
  else if (tagType === 'subcategory') paramName = 'subcategory';
  param[paramName] = tag;
  if (searchInfo?.sort) param.sort = searchInfo.sort;
  const query = resolveSearchParamUrl(param);
  return `${CONFIG.searchUrl}${query ? `?${query}` : ''}`;
}

const TAG_COLORS: Record<string, string> = {
  base: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  category: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  subcategory: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  tag2: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

const TAG_CYCLE = [
  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
];

export function resolveTagColor(type: string, index: number) {
  if (type in TAG_COLORS) return TAG_COLORS[type];
  if (type === 'tag') return TAG_CYCLE[index % TAG_CYCLE.length];
  return 'bg-muted text-muted-foreground';
}

const BASE_COLORS = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'];

export function resolveBaseColor(base: string) {
  const index = CONFIG.resBaseList.findIndex((item) => item.name === base);
  return BASE_COLORS[(index >= 0 ? index : 0) % BASE_COLORS.length];
}
