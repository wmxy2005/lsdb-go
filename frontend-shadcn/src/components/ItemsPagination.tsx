import { Button } from '@/components/ui/button';
import { buildPaginationItems } from '@/lib/pagination';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ItemsPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const navButtonClass =
  'h-9 cursor-pointer rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 shadow-none text-xs font-medium';

const pageButtonClass =
  'h-9 min-w-9 cursor-pointer rounded-lg shadow-none text-xs font-medium px-2.5';

export function ItemsPagination({
  page,
  totalPages,
  onPageChange,
}: ItemsPaginationProps) {
  const { t } = useTranslation();
  const pageItems = useMemo(
    () => buildPaginationItems(page, totalPages),
    [page, totalPages],
  );

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <div className="flex items-center justify-center border-t border-border/40 pt-6">
      {/* Narrow: prev + page info + next */}
      <div className="flex md:hidden items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          className={navButtonClass}
          disabled={isFirstPage}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 size-4" />
          {t('items.pagination.prev')}
        </Button>
        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
          {t('items.pagination.pageInfo', { page, totalPages })}
        </span>
        <Button
          variant="outline"
          size="sm"
          className={navButtonClass}
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          {t('items.pagination.next')}
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>

      {/* Wide: prev + [first + pages + last] + next */}
      <div className="hidden md:flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className={navButtonClass}
          disabled={isFirstPage}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="mr-1 size-4" />
          {t('items.pagination.prev')}
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className={navButtonClass}
            disabled={isFirstPage}
            aria-label={t('items.pagination.first')}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="mr-1 size-4" />
            {t('items.pagination.first')}
          </Button>

          {pageItems.map((item, index) =>
            item.type === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-xs font-medium text-zinc-400 dark:text-zinc-500"
                aria-hidden
              >
                …
              </span>
            ) : (
              <Button
                key={item.value}
                variant={item.value === page ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  pageButtonClass,
                  item.value !== page &&
                    'border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60',
                )}
                aria-label={t('items.pagination.gotoPage', { page: item.value })}
                aria-current={item.value === page ? 'page' : undefined}
                onClick={() => onPageChange(item.value)}
              >
                {item.value}
              </Button>
            ),
          )}

          <Button
            variant="outline"
            size="sm"
            className={navButtonClass}
            disabled={isLastPage}
            aria-label={t('items.pagination.last')}
            onClick={() => onPageChange(totalPages)}
          >
            {t('items.pagination.last')}
            <ChevronsRight className="ml-1 size-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className={navButtonClass}
          disabled={isLastPage}
          onClick={() => onPageChange(page + 1)}
        >
          {t('items.pagination.next')}
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
