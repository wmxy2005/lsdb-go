import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useEffect, useRef, useState } from 'react';

interface ItemThumbnailProps {
  src: string;
  srcW?: number;
  srcH?: number;
  rollSrc?: string;
}

export function ItemThumbnail({ src, srcW, srcH, rollSrc }: ItemThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState('0%');
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<number | null>(null);
  const isTouch = useMediaQuery('(hover: none)');

  useEffect(() => {
    const image = new Image();
    image.src = src;
    image.onload = () => setIsLoading(false);
    image.onerror = () => {
      setIsLoading(false);
      setIsError(true);
    };
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    };
  }, [rollSrc]);

  const handleHover = (play: boolean) => {
    const video = videoRef.current;
    if (!video || !rollSrc) return;
    setHovered(play);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (play) {
      video.play().catch(() => {});
      timerRef.current = window.setInterval(() => {
        const total = video.duration;
        const current = video.currentTime;
        if (total > 0) {
          const pct = ((current / total) * 100).toFixed(0);
          setProgress(`${pct}%`);
        }
      }, 500);
    } else {
      video.pause();
      setProgress('0%');
    }
  };

  const handleTouchToggle = (e: React.MouseEvent) => {
    if (!isTouch || !rollSrc) return;
    e.preventDefault();
    e.stopPropagation();
    handleHover(!hovered);
  };

  if (isLoading) {
    return (
      <Skeleton className="w-full h-full" />
    );
  }

  if (isError) {
    return (
      <div className="bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 flex h-full w-full items-center justify-center text-xs font-medium">
        加载失败
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      onClick={handleTouchToggle}
      onMouseEnter={!isTouch && rollSrc ? () => handleHover(true) : undefined}
      onMouseLeave={!isTouch && rollSrc ? () => handleHover(false) : undefined}
    >
      <div className={`w-full h-full flex justify-center items-center ${hovered ? 'thumbnail__image-hovered' : ''}`}>
        <img src={src} alt="" className="block w-full h-full object-cover" loading="lazy" />
      </div>
      {rollSrc && (
        <div className={hovered ? 'thumbnail__video thumbnail__video-hovered' : 'thumbnail__video'}>
          <div className="video__progress" style={{ width: progress }} />
          <video ref={videoRef} loop muted playsInline src={rollSrc} className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
