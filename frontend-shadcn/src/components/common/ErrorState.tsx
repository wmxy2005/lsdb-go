import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ErrorState({
  title = '无法访问',
  description = '请登录后重试',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <ShieldAlert className="text-destructive size-12" />
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      <div className="flex gap-2">
        <Button asChild><Link to="/login">去登录</Link></Button>
        {onRetry && <Button variant="outline" onClick={onRetry}>重试</Button>}
      </div>
    </div>
  );
}
