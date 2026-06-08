import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('bg-accent animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };
