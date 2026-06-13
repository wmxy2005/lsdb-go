import PhotoSwipe from 'photoswipe';
import type { PhotoSwipeOptions } from 'photoswipe';

import 'photoswipe/dist/photoswipe.css';

import { guardHistoryBack } from '@/lib/history-guard';

/**
 * Shared PhotoSwipe options for all lightbox entry points.
 * bgOpacity: 1 avoids the default 0.8 element opacity; backdrop level is set via --pswp-bg in index.css.
 */
export const PHOTOSWIPE_OPTIONS: Partial<PhotoSwipeOptions> = {
  bgOpacity: 1,
};

/** Detail page lightbox — opaque backdrop (see .pswp--detail-page in index.css). */
export const PHOTOSWIPE_DETAIL_OPTIONS: Partial<PhotoSwipeOptions> = {
  ...PHOTOSWIPE_OPTIONS,
  mainClass: 'pswp--detail-page',
};

export function createPhotoSwipe(options: PhotoSwipeOptions): PhotoSwipe {
  return new PhotoSwipe({
    ...PHOTOSWIPE_OPTIONS,
    ...options,
  });
}

/** Wire a PhotoSwipe instance so the browser Back button closes it. */
export function attachPreviewHistory(pswp: PhotoSwipe): void {
  const release = guardHistoryBack(() => pswp.close());
  pswp.on('destroy', () => release());
}

export function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth > 0 ? img.naturalWidth : 1200,
        height: img.naturalHeight > 0 ? img.naturalHeight : 800,
      });
    };
    img.onerror = () => resolve({ width: 1200, height: 800 });
    img.src = url;
  });
}

export function openPhotoSwipeFromUrl(url: string): void {
  void loadImageSize(url).then(({ width, height }) => {
    const pswp = createPhotoSwipe({
      dataSource: [{ src: url, width, height }],
      index: 0,
    });
    attachPreviewHistory(pswp);
    pswp.init();
  });
}
