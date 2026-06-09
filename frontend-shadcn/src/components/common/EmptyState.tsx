import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Inbox className="text-muted-foreground size-12" />
      <h3 className="text-lg font-semibold tracking-tight">{title ?? t('common.empty.defaultTitle')}</h3>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action}
    </div>
  );
}
