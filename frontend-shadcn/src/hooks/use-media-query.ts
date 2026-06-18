import { useEffect, useState } from 'react';

/**
 * Shared MediaQueryList registry: the items grid renders ~20 cards, each of
 * which (plus their thumbnails) calls useMediaQuery with the same handful of
 * queries. Without sharing, that creates dozens of matchMedia listeners for a
 * few distinct queries. Here every distinct query string is backed by a single
 * MediaQueryList with one native listener that fans out to all subscribers.
 */
const registry = new Map<
  string,
  { mql: MediaQueryList; subscribers: Set<() => void> }
>();

function subscribe(query: string, onChange: () => void): () => void {
  let entry = registry.get(query);
  if (!entry) {
    const mql = window.matchMedia(query);
    const subscribers = new Set<() => void>();
    const listener = () => subscribers.forEach((fn) => fn());
    mql.addEventListener('change', listener);
    entry = { mql, subscribers };
    registry.set(query, entry);
    // Stash the native listener so we can detach it once the last subscriber leaves.
    (entry as unknown as { listener: () => void }).listener = listener;
  }
  entry.subscribers.add(onChange);

  return () => {
    const current = registry.get(query);
    if (!current) return;
    current.subscribers.delete(onChange);
    if (current.subscribers.size === 0) {
      current.mql.removeEventListener(
        'change',
        (current as unknown as { listener: () => void }).listener,
      );
      registry.delete(query);
    }
  };
}

function getMatches(query: string): boolean {
  const entry = registry.get(query);
  if (entry) return entry.mql.matches;
  return typeof window !== 'undefined' ? window.matchMedia(query).matches : false;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => getMatches(query));

  useEffect(() => {
    const update = () => setMatches(getMatches(query));
    const unsubscribe = subscribe(query, update);
    update();
    return unsubscribe;
  }, [query]);

  return matches;
}
