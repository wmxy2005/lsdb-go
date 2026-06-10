import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';

const VISIBILITY_HEIGHT = 500;

interface BackToTopButtonProps {
  scrollContainerRef: RefObject<HTMLDivElement>;
}

export function BackToTopButton({ scrollContainerRef }: BackToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateVisible = () => {
      setVisible(container.scrollTop >= VISIBILITY_HEIGHT);
    };

    updateVisible();
    container.addEventListener('scroll', updateVisible, { passive: true });
    return () => container.removeEventListener('scroll', updateVisible);
  }, [scrollContainerRef]);

  const handleClick = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Button
      type="button"
      size="icon"
      aria-label="Back to top"
      title="Back to top"
      onClick={handleClick}
      className={cn(
        'fixed right-5 bottom-5 z-50 size-11 rounded-full border border-border/70 bg-background/90 text-foreground shadow-lg shadow-black/10 backdrop-blur transition-all duration-200 hover:bg-accent md:right-8 md:bottom-8',
        visible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <ArrowUp className="size-5" />
    </Button>
  );
}
