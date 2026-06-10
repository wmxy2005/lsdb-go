export type PaginationItem =
  | { type: 'page'; value: number }
  | { type: 'ellipsis' };

export function buildPaginationItems(
  current: number,
  total: number,
  siblings = 2,
): PaginationItem[] {
  if (total <= 1) return [];

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => ({
      type: 'page' as const,
      value: i + 1,
    }));
  }

  const items: PaginationItem[] = [{ type: 'page', value: 1 }];

  const rangeStart = Math.max(2, current - siblings);
  const rangeEnd = Math.min(total - 1, current + siblings);

  if (rangeStart > 2) {
    items.push({ type: 'ellipsis' });
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    items.push({ type: 'page', value: i });
  }

  if (rangeEnd < total - 1) {
    items.push({ type: 'ellipsis' });
  }

  if (total > 1) {
    items.push({ type: 'page', value: total });
  }

  return dedupeAdjacentPages(items);
}

function dedupeAdjacentPages(items: PaginationItem[]): PaginationItem[] {
  const result: PaginationItem[] = [];

  for (const item of items) {
    const prev = result[result.length - 1];
    if (
      item.type === 'page' &&
      prev?.type === 'page' &&
      prev.value === item.value
    ) {
      continue;
    }
    result.push(item);
  }

  return result;
}
