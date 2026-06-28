import { queryItemList } from '@/api/items';
import type { ApiResult, PageInfo } from '@/api/types';
import {
  clearItemsPageCacheOnUnload,
  getItemsScrollContainer,
  itemsParamsToApiParams,
  loadItemsPageCache,
  loadItemsScrollState,
  saveItemsPageCache,
  takeItemsPageSeed,
  type ItemsUrlParams,
} from '@/lib/items-page-cache';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Location } from 'react-router-dom';
import { useNavigationType } from 'react-router-dom';

function computeShouldRestoreCache(
  fromPopState: boolean,
  navigationType: ReturnType<typeof useNavigationType>,
): boolean {
  return fromPopState || navigationType === 'POP';
}

export function useItemsPageData(
  location: Location,
  urlParams: ItemsUrlParams,
  routerSearch: string,
) {
  const navigationType = useNavigationType();
  const isPopNavigationRef = useRef(false);

  const [data, setData] = useState<ApiResult<PageInfo> | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRestoreCache, setShouldRestoreCache] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const pageInfo: PageInfo | undefined = data?.success ? data.data : undefined;
  const isError = !!data && !data.success;

  useEffect(() => {
    const onPopState = () => {
      isPopNavigationRef.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    window.onbeforeunload = clearItemsPageCacheOnUnload;
    return () => {
      window.onbeforeunload = null;
    };
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;

    const fromPopState = isPopNavigationRef.current;
    isPopNavigationRef.current = false;

    const restore = computeShouldRestoreCache(fromPopState, navigationType);
    setShouldRestoreCache(restore);

    if (restore) {
      const stored = loadItemsPageCache(location.key, routerSearch);
      if (stored) {
        setData(stored);
        setIsLoading(false);
        const savedScroll = loadItemsScrollState(`${location.key}${routerSearch}`);
        if (savedScroll.top <= 0 && savedScroll.ratio <= 0) {
          const mainEl = getItemsScrollContainer();
          mainEl?.scrollTo({ top: 0, behavior: 'auto' });
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
        return;
      }
    }

    // Reuse data already fetched for this exact navigation instead of hitting
    // the API: either a one-shot seed handed over from elsewhere (e.g. the
    // command-menu search) or data this same history entry already cached.
    // Both are keyed strictly to this navigation, so there is no staleness
    // risk — and the cache lookup covers the React StrictMode dev double-mount,
    // where the throwaway first pass consumes the seed and writes it here.
    const reuse =
      loadItemsPageCache(location.key, routerSearch) ??
      takeItemsPageSeed(routerSearch);
    if (reuse) {
      setData(reuse);
      saveItemsPageCache(location.key, reuse, routerSearch);
      setIsLoading(false);
      const mainEl = getItemsScrollContainer();
      mainEl?.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    setIsLoading(true);
    setData(undefined);
    const mainEl = getItemsScrollContainer();
    mainEl?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });

    void queryItemList(itemsParamsToApiParams(urlParams)).then((res) => {
      if (cancelled) return;
      setData(res);
      if (res.success) {
        saveItemsPageCache(location.key, res, routerSearch);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [location.key, routerSearch, navigationType, urlParams]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const res = await queryItemList(itemsParamsToApiParams(urlParams));
    setData(res);
    if (res.success) {
      saveItemsPageCache(location.key, res, routerSearch);
    }
    setIsLoading(false);
  }, [location.key, routerSearch, urlParams]);

  const persistPageData = useCallback(
    (updater: (pageInfo: PageInfo) => PageInfo) => {
      const current = dataRef.current;
      if (!current?.success || !current.data) return;
      const updated: ApiResult<PageInfo> = {
        ...current,
        data: updater(current.data),
      };
      setData(updated);
      saveItemsPageCache(location.key, updated, routerSearch);
    },
    [location.key, routerSearch],
  );

  return {
    data,
    pageInfo,
    isLoading,
    isError,
    shouldRestoreCache,
    refetch,
    persistPageData,
  };
}
