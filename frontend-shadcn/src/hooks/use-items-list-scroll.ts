import {
  getItemsMaxScroll,
  getItemsScrollContainer,
  loadItemsScrollState,
  saveItemsScroll,
  type ItemsScrollState,
} from '@/lib/items-page-cache';
import { useEffect, useLayoutEffect, useRef } from 'react';

const ZERO_SAVE_DELAY_MS = 300;
const RESTORE_TIMEOUT_MS = 5000;
const LAYOUT_STABLE_FRAMES = 4;

function resolveScrollTarget(
  container: HTMLElement,
  state: ItemsScrollState,
): number {
  const maxScroll = getItemsMaxScroll(container);
  if (maxScroll <= 0) return 0;

  if (state.ratio > 0) {
    return Math.min(maxScroll, Math.round(state.ratio * maxScroll));
  }

  return Math.min(maxScroll, state.top);
}

function bindImageLoadListeners(
  root: ParentNode,
  handler: () => void,
  observedImages: WeakSet<Element>,
): void {
  root.querySelectorAll('img').forEach((img) => {
    if (img.complete || observedImages.has(img)) return;
    observedImages.add(img);
    img.addEventListener('load', handler, { once: true });
  });
}

export function useItemsListScroll(
  scrollKey: string,
  ready: boolean,
  shouldRestore: boolean,
) {
  const scrollStateRef = useRef<ItemsScrollState>({ top: 0, ratio: 0 });
  const hadPositiveScrollRef = useRef(false);
  const isRestoringRef = useRef(false);
  const zeroSaveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    const container = getItemsScrollContainer();
    if (!container) return;

    const syncState = () => {
      const top = container.scrollTop;
      const maxScroll = getItemsMaxScroll(container);
      scrollStateRef.current = {
        top,
        ratio: maxScroll > 0 ? top / maxScroll : 0,
      };
      return scrollStateRef.current;
    };

    syncState();
    if (scrollStateRef.current.top > 0) {
      hadPositiveScrollRef.current = true;
    }

    const persistState = () => {
      const state = scrollStateRef.current;
      saveItemsScroll(scrollKey, state.top, state.ratio);
    };

    const onScroll = () => {
      if (isRestoringRef.current) return;

      syncState();

      if (scrollStateRef.current.top > 0) {
        hadPositiveScrollRef.current = true;
        clearTimeout(zeroSaveTimerRef.current);
        persistState();
        return;
      }

      if (!hadPositiveScrollRef.current) return;

      clearTimeout(zeroSaveTimerRef.current);
      zeroSaveTimerRef.current = setTimeout(() => {
        saveItemsScroll(scrollKey, 0, 0);
      }, ZERO_SAVE_DELAY_MS);
    };

    container.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(zeroSaveTimerRef.current);
      if (scrollStateRef.current.top > 0 && !isRestoringRef.current) {
        persistState();
      }
    };
  }, [scrollKey]);

  useLayoutEffect(() => {
    if (!shouldRestore || !ready) return;

    const savedState = loadItemsScrollState(scrollKey);
    const container = getItemsScrollContainer();

    if (savedState.top <= 0 && savedState.ratio <= 0) {
      if (container) {
        container.scrollTo({ top: 0, behavior: 'auto' });
        scrollStateRef.current = { top: 0, ratio: 0 };
        hadPositiveScrollRef.current = false;
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      return;
    }

    if (!container) {
      window.scrollTo({ top: savedState.top, behavior: 'auto' });
      return;
    }

    isRestoringRef.current = true;
    let stopped = false;
    let lastMaxScroll = -1;
    let stableFrames = 0;
    const observedImages = new WeakSet<Element>();

    const tryRestore = () => {
      if (stopped) return;

      const maxScroll = getItemsMaxScroll(container);
      const target = resolveScrollTarget(container, savedState);
      container.scrollTo({ top: target, behavior: 'auto' });
      scrollStateRef.current = {
        top: container.scrollTop,
        ratio: maxScroll > 0 ? container.scrollTop / maxScroll : 0,
      };

      if (maxScroll === lastMaxScroll) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastMaxScroll = maxScroll;
      }

      const atTarget = Math.abs(container.scrollTop - target) <= 2;
      if (atTarget && stableFrames >= LAYOUT_STABLE_FRAMES) {
        stop();
      }
    };

    const stop = () => {
      if (stopped) return;
      stopped = true;
      isRestoringRef.current = false;
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      clearTimeout(timeoutId);
    };

    const resizeObserver = new ResizeObserver(() => tryRestore());
    resizeObserver.observe(container);

    const listRoot = container.querySelector('.grid');
    if (listRoot) resizeObserver.observe(listRoot);

    bindImageLoadListeners(container, tryRestore, observedImages);

    const mutationObserver = new MutationObserver(() => {
      bindImageLoadListeners(container, tryRestore, observedImages);
      tryRestore();
    });
    mutationObserver.observe(container, { childList: true, subtree: true });

    let burstAttempts = 0;
    const burst = () => {
      if (stopped) return;
      tryRestore();
      if (stableFrames >= LAYOUT_STABLE_FRAMES || burstAttempts >= 60) return;
      burstAttempts += 1;
      requestAnimationFrame(burst);
    };

    requestAnimationFrame(burst);

    const timeoutId = setTimeout(stop, RESTORE_TIMEOUT_MS);

    return stop;
  }, [scrollKey, ready, shouldRestore]);
}
