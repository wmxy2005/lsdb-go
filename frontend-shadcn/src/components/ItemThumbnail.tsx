import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ItemThumbnailProps {
  src: string;
  srcW?: number;
  srcH?: number;
  rollSrc?: string;
}

// Cap the thumbnail height at a 4:3 ratio of the card width on >=sm screens.
// `cqw` resolves against the @container ancestor (the card's thumbnail link),
// so 75cqw == 0.75 * card width — the same value the old ResizeObserver computed,
// now done purely in CSS with no per-card observers or state.
const HEIGHT_CAP = 'sm:max-h-[75cqw]';

export function ItemThumbnail({ src, srcW, srcH, rollSrc }: ItemThumbnailProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isTouch = useMediaQuery('(hover: none)');

  useLayoutEffect(() => {
    setIsError(false);
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      setIsLoading(false);
      setIsError(img.naturalWidth === 0);
    } else {
      setIsLoading(true);
    }
  }, [src]);

  useEffect(() => {
    setHovered(false);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (progressRef.current) progressRef.current.style.width = '0%';
    videoRef.current?.pause();
    if (rollSrc) {
      videoRef.current?.load();
    }
  }, [rollSrc]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      videoRef.current?.pause();
    };
  }, []);

  const handleHover = (play: boolean) => {
    const video = videoRef.current;
    if (!video || !rollSrc) return;
    setHovered(play);
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (play) {
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) {
        video.load();
      }
      video.play().catch(() => {});
      const tick = () => {
        const bar = progressRef.current;
        if (bar && video.duration > 0) {
          bar.style.width = `${(video.currentTime / video.duration) * 100}%`;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      video.pause();
      if (progressRef.current) progressRef.current.style.width = '0%';
    }
  };

  const handleTouchToggle = (e: React.MouseEvent) => {
    if (!isTouch || !rollSrc) return;
    e.preventDefault();
    e.stopPropagation();
    handleHover(!hovered);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setIsError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setIsError(true);
  };

  const hasDimensions = (srcW ?? 0) > 0 && (srcH ?? 0) > 0;

  if (isError) {
    return (
      <div
        className={cn(
          'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 flex h-full w-full items-center justify-center text-xs font-medium',
          HEIGHT_CAP,
        )}
      >
        {t('common.loadFailed')}
      </div>
    );
  }

  return (
    <div
      className={cn('relative w-full h-full overflow-hidden', HEIGHT_CAP)}
      onClick={handleTouchToggle}
      onMouseEnter={!isTouch && rollSrc ? () => handleHover(true) : undefined}
      onMouseLeave={!isTouch && rollSrc ? () => handleHover(false) : undefined}
    >
      <div className={`relative w-full ${hovered ? 'thumbnail__image-hovered' : ''}`}>
        <div className={cn('relative w-full overflow-hidden', HEIGHT_CAP)}>
          {isLoading &&
            (hasDimensions ? (
              <Skeleton className="thumbnail__skeleton absolute inset-0 rounded-none" />
            ) : (
              <Skeleton className="thumbnail__skeleton aspect-video w-full absolute inset-0" />
            ))}
          <img
            ref={imgRef}
            src={src}
            width={hasDimensions ? srcW : undefined}
            height={hasDimensions ? srcH : undefined}
            alt=""
            className={cn(
              'block w-full object-cover',
              HEIGHT_CAP,
              isLoading && 'opacity-0',
              hasDimensions && 'h-auto',
              !hasDimensions && 'aspect-video',
            )}
            loading="lazy"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>
      {rollSrc && (
        <div className={hovered ? 'thumbnail__video thumbnail__video-hovered' : 'thumbnail__video'}>
          <div ref={progressRef} className="video__progress" style={{ width: '0%' }} />
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="metadata"
            src={rollSrc}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
