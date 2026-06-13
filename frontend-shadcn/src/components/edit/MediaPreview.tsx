import { openPhotoSwipeFromUrl } from '@/lib/photoswipe';
import { guardHistoryBack } from '@/lib/history-guard';
import { resolveUrl } from '@/lib/resource-url';
import { Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|avi|m4v)$/i;
export const MEDIA_PREVIEW_OVERLAY_CLASS = 'media-preview-overlay';

export type VideoPreviewState = { url: string; filename: string } | null;

export function isMediaPreviewTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(`.${MEDIA_PREVIEW_OVERLAY_CLASS}`));
}

export function isMediaPreviewActive() {
  return document.querySelector(`.${MEDIA_PREVIEW_OVERLAY_CLASS}`) !== null;
}

export function isVideoFile(filename: string) {
  return VIDEO_EXT.test(filename);
}

export type MediaPreviewParams = {
  filename: string;
  base: string;
  category: string;
  subcategory: string;
  name: string;
  kind?: 'auto' | 'video' | 'image';
};

type MediaPreviewContextValue = {
  openMediaPreview: (params: MediaPreviewParams) => void;
};

const MediaPreviewContext = createContext<MediaPreviewContextValue | null>(null);

function VideoPreviewDialog({
  url,
  filename,
  onClose,
}: {
  url: string;
  filename: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  useEffect(() => {
    setError(null);
    setLoading(true);
  }, [url]);

  const overlay = (
    <div
      className={`${MEDIA_PREVIEW_OVERLAY_CLASS} fixed inset-0 z-[9999]`}
      role="dialog"
      aria-modal="true"
      aria-label={t('media.previewVideo', { filename })}
    >
      <button
        type="button"
        aria-label={t('media.closePreview')}
        className="media-preview-backdrop"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        className="media-preview-close"
        onClick={onClose}
        aria-label={t('media.closePreview')}
      >
        <X className="size-8" strokeWidth={1.5} />
      </button>

      <div className="pointer-events-none relative z-10 flex h-full items-center justify-center p-4 pt-16">
        <div
          className="pointer-events-auto relative max-h-[calc(100vh-5rem)] max-w-full"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-white/70" />
            </div>
          )}
          {error ? (
            <div className="max-w-md space-y-2 text-center text-sm text-white/80">
              <p>{t('media.videoLoadFailed')}</p>
              <p className="text-xs text-white/50 break-all">{error}</p>
            </div>
          ) : (
            <video
              key={url}
              ref={videoRef}
              src={url}
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
              className="max-h-[calc(100vh-5rem)] max-w-full object-contain"
              onLoadedData={() => setLoading(false)}
              onCanPlay={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(filename);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

export function MediaPreviewProvider({
  children,
  videoPreview,
  onVideoPreviewChange,
}: {
  children: ReactNode;
  videoPreview: VideoPreviewState;
  onVideoPreviewChange: (preview: VideoPreviewState) => void;
}) {
  const openMediaPreview = useCallback(
    (params: MediaPreviewParams) => {
      if (!params.filename) return;
      const url = resolveUrl(
        params.base,
        params.category,
        params.subcategory,
        params.name,
        params.filename,
        { force: false },
      );
      const kind = params.kind ?? 'auto';
      const asVideo = kind === 'video' || (kind === 'auto' && isVideoFile(params.filename));
      if (asVideo) {
        // Defer until the opening click finishes so Radix Sheet won't treat it as outside dismiss.
        queueMicrotask(() => {
          onVideoPreviewChange({ url, filename: params.filename });
        });
      } else {
        onVideoPreviewChange(null);
        openPhotoSwipeFromUrl(
          resolveUrl(params.base, params.category, params.subcategory, params.name, params.filename),
        );
      }
    },
    [onVideoPreviewChange],
  );

  const closeVideoPreview = useCallback(() => {
    onVideoPreviewChange(null);
  }, [onVideoPreviewChange]);

  // Browser Back closes the video preview instead of leaving the page. Keyed on
  // the `videoPreview` state transition (not a component mount), so StrictMode's
  // mount-time effect double-invoke can't race the pushed history entry.
  useEffect(() => {
    if (!videoPreview) return;
    return guardHistoryBack(() => onVideoPreviewChange(null));
  }, [videoPreview, onVideoPreviewChange]);

  return (
    <MediaPreviewContext.Provider value={{ openMediaPreview }}>
      {children}
      {videoPreview && (
        <VideoPreviewDialog
          url={videoPreview.url}
          filename={videoPreview.filename}
          onClose={closeVideoPreview}
        />
      )}
    </MediaPreviewContext.Provider>
  );
}

export function useMediaPreview() {
  const ctx = useContext(MediaPreviewContext);
  if (!ctx) {
    throw new Error('useMediaPreview must be used within MediaPreviewProvider');
  }
  return ctx;
}
