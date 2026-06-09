import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="LSDB"
      className={cn(
        'block h-8 aspect-[3/1] shrink-0 bg-primary',
        '[mask-image:url(/logo.svg)] [mask-repeat:no-repeat] [mask-size:contain] [mask-position:center]',
        '[-webkit-mask-image:url(/logo.svg)] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:contain] [-webkit-mask-position:center]',
        className,
      )}
    />
  );
}
