import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function PageActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {children}
    </div>
  );
}

export function PageActionButton({
  icon,
  label,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { icon: ReactNode; label: string }) {
  return (
    <Button className={className} aria-label={label} {...props}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
