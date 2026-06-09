import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <ShieldAlert className="text-destructive size-12" />
      <h3 className="text-lg font-semibold tracking-tight">{title ?? t('common.error.defaultTitle')}</h3>
      <p className="text-muted-foreground max-w-sm text-sm">{description ?? t('common.error.defaultDescription')}</p>
      <div className="flex gap-2">
        <Button asChild><Link to="/login">{t('common.goLogin')}</Link></Button>
        {onRetry && <Button variant="outline" onClick={onRetry}>{t('common.retry')}</Button>}
      </div>
    </div>
  );
}
