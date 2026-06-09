import { queryItemList } from '@/api/items';
import type { PageInfo, RoleListItem } from '@/api/types';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { CONFIG } from '@/constants/config';
import { usePageTitle } from '@/hooks/use-page-title-context';
import { resBaseLabel, resTypeLabel } from '@/lib/i18n-labels';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, Eye, Tag, Calendar as CalendarIcon, Filter, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const filterFieldFocus =
  'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0';

const filterInputClass = `h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none ${filterFieldFocus}`;

const filterInputIconClass = `pl-8 ${filterInputClass}`;

const filterSelectClass = `h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium shadow-none ${filterFieldFocus}`;

const filterChipClass = 'h-6 text-[10px] font-medium px-2.5 rounded-md';

function hasFilterChips(pageInfo: PageInfo) {
  return (
    (pageInfo.keyword?.length ?? 0) > 0 ||
    (pageInfo.category?.length ?? 0) > 0 ||
    (pageInfo.tag?.length ?? 0) > 0 ||
    !!pageInfo.subcategory?.trim()
  );
}

function RelatedRoleButtons({ roleList }: { roleList: RoleListItem[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roleList.map((role) => {
        const label = role.name ?? role.title ?? '';
        const imageSrc = role.imageSrc ?? role.avatarSrc;
        const avatarUrl = imageSrc ? `${CONFIG.apiUrl}${imageSrc}` : undefined;
        return (
          <Button
            key={`${role.id}-${role.tagIndex ?? 0}`}
            variant="outline"
            className="rounded-full h-9 pl-1 pr-3 gap-2 font-semibold text-primary border-primary/30 hover:bg-primary/5"
            asChild
          >
            <Link to={`/items/role?id=${role.id}`}>
              <Avatar className="size-7">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={label} />}
                <AvatarFallback className="text-[10px] font-semibold">{label.charAt(0).toUpperCase() || '?'}</AvatarFallback>
              </Avatar>
              {label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

function FilterChips({ pageInfo }: { pageInfo: PageInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pageInfo.keyword?.map((kw) => (
        <Badge key={`keyword-${kw}`} variant="outline" className={filterChipClass}>
          {kw}
        </Badge>
      ))}
      {pageInfo.category?.map((cat) => (
        <Badge
          key={`category-${cat}`}
          variant="outline"
          className={`${filterChipClass} border-red-500/30 text-red-600 dark:text-red-400`}
        >
          {cat}
        </Badge>
      ))}
      {pageInfo.tag?.map((tag) => (
        <Badge
          key={`tag-${tag}`}
          variant="outline"
          className={`${filterChipClass} border-emerald-500/30 text-emerald-600 dark:text-emerald-400`}
        >
          {tag}
        </Badge>
      ))}
      {pageInfo.subcategory?.trim() && (
        <Badge variant="outline" className={filterChipClass}>
          {pageInfo.subcategory}
        </Badge>
      )}
    </div>
  );
}

const searchParsers = {
  keyword: parseAsString,
  category: parseAsString,
  tag: parseAsString,
  dateFrom: parseAsString,
  dateTo: parseAsString,
  matchMode: parseAsString,
  base: parseAsString,
  type: parseAsString,
  favi: parseAsString,
  sort: parseAsString,
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsInteger.withDefault(20),
};

export default function ItemsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useQueryStates(searchParsers);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ['items', params],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await queryItemList({
        keyword: params.keyword ?? undefined,
        category: params.category ?? undefined,
        tag: params.tag ?? undefined,
        dateFrom: params.dateFrom ?? undefined,
        dateTo: params.dateTo ?? undefined,
        matchMode: params.matchMode ?? undefined,
        base: params.base ?? undefined,
        type: params.type ?? undefined,
        favi: params.favi ?? undefined,
        sort: params.sort ?? undefined,
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      return res;
    },
  });

  const pageInfo: PageInfo | undefined = data?.success ? data.data : undefined;
  const showInitialLoading = isPending && !data;

  const documentTitle = useMemo(() => {
    if (!pageInfo) return undefined;
    const rawTitle = pageInfo.title?.trim() ?? '';
    const info = rawTitle === 'all' || !rawTitle ? t('config.all') : rawTitle;
    return t('page.documentTitle', {
      info,
      page: pageInfo.current ?? params.page,
      pages: Math.max(pageInfo.pages ?? 1, 1),
    });
  }, [pageInfo, params.page, t]);

  const breadcrumbLabel = pageInfo?.title?.trim() ? pageInfo.title : null;
  usePageTitle(documentTitle, breadcrumbLabel);

  if (isError || (data && !data.success)) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const applyFilter = (updates: Partial<typeof params>) => {
    setParams({ ...updates, page: 1 });
  };

  return (
    <div className="w-full space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Base Categories */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('items.filter.resourceCategory')}</span>
              <Select value={params.base ?? '__all__'} onValueChange={(v) => applyFilter({ base: v === '__all__' ? null : v })}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-primary">
                  <SelectValue placeholder={t('items.filter.allCategories')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/40">
                  {CONFIG.resBaseList.map((b) => (
                    <SelectItem key={b.name || 'all'} value={b.name || '__all__'} className="text-xs rounded-md">{resBaseLabel(t, b.name)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Selection */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('items.filter.sortBy')}</span>
              <Select value={params.sort ?? '__default__'} onValueChange={(v) => applyFilter({ sort: v === '__default__' ? null : v })}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-primary">
                  <SelectValue placeholder={t('items.filter.sortBy')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/40">
                  <SelectItem value="__default__" className="text-xs rounded-md">{t('items.sort.createdAt')}</SelectItem>
                  <SelectItem value="date" className="text-xs rounded-md">{t('items.sort.date')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Favorites Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('items.filter.myFavorites')}</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 px-3 h-9 text-xs shadow-none">
                <Switch
                  id="favorites-toggle"
                  checked={params.favi === 'true'}
                  onCheckedChange={(c) => applyFilter({ favi: c ? 'true' : null })}
                  className="scale-90"
                />
                <Label htmlFor="favorites-toggle" className="cursor-pointer font-medium text-zinc-600 dark:text-zinc-300">
                  {t('items.filter.favoritesOnly')}
                </Label>
              </div>
            </div>
          </div>

          {/* Resource Types Buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider self-start sm:self-end">{t('items.filter.displayType')}</span>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-zinc-100/50 dark:bg-zinc-900/30 p-1 h-9">
              {CONFIG.resTypeList.map((typeItem) => {
                const isSelected = params.type === typeItem.name || (!params.type && !typeItem.name);
                return (
                  <Button
                    key={typeItem.name || 'all'}
                    size="sm"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    className={`h-7 rounded-md px-3 text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
                    }`}
                    onClick={() => applyFilter({ type: typeItem.name || null })}
                  >
                    {resTypeLabel(t, typeItem.name)}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advanced Filters Accordion */}
        <Accordion type="single" collapsible className="border-t border-border/40 pt-2">
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline [&[data-state=open]]:text-foreground transition-colors">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-zinc-400" />
                <span>{t('items.filter.advancedOptions')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-2 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="filter-keyword" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.keyword')}</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input defaultValue={params.keyword ?? ''} id="filter-keyword" placeholder={t('items.filter.keywordPlaceholder')} className={filterInputIconClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-tag" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.tag')}</Label>
                  <div className="relative">
                    <Tag className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input defaultValue={params.tag ?? ''} id="filter-tag" placeholder={t('items.filter.tagPlaceholder')} className={filterInputIconClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-category" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.category')}</Label>
                  <div className="relative">
                    <SlidersHorizontal className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input defaultValue={params.category ?? ''} id="filter-category" placeholder={t('items.filter.categoryPlaceholder')} className={filterInputIconClass} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.matchMode')}</Label>
                  <Select value={params.matchMode ?? '__and__'} onValueChange={(v) => setParams({ matchMode: v === '__and__' ? null : v })}>
                    <SelectTrigger className={filterSelectClass}>
                      <SelectValue placeholder="AND" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border/40">
                      <SelectItem value="__and__" className="text-xs rounded-md">{t('items.filter.matchAnd')}</SelectItem>
                      <SelectItem value="or" className="text-xs rounded-md">{t('items.filter.matchOr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-from" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.dateFrom')}</Label>
                  <Input type="date" defaultValue={params.dateFrom ?? ''} id="filter-date-from" className={filterInputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-to" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.dateTo')}</Label>
                  <Input type="date" defaultValue={params.dateTo ?? ''} id="filter-date-to" className={filterInputClass} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  size="sm"
                  className="h-8 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm"
                  onClick={() => {
                    const keyword = (document.getElementById('filter-keyword') as HTMLInputElement)?.value;
                    const tag = (document.getElementById('filter-tag') as HTMLInputElement)?.value;
                    const category = (document.getElementById('filter-category') as HTMLInputElement)?.value;
                    const dateFrom = (document.getElementById('filter-date-from') as HTMLInputElement)?.value;
                    const dateTo = (document.getElementById('filter-date-to') as HTMLInputElement)?.value;
                    applyFilter({
                      keyword: keyword || null,
                      tag: tag || null,
                      category: category || null,
                      dateFrom: dateFrom || null,
                      dateTo: dateTo || null,
                    });
                  }}
                >
                  <Filter className="mr-1.5 size-3.5" />
                  {t('items.filter.apply')}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Metadata & Related Roles */}
      {pageInfo && (
        <div className="flex flex-col gap-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 px-5 py-3 text-xs border border-border/40 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2 text-zinc-500 dark:text-zinc-400">
            {hasFilterChips(pageInfo) && (
              <>
                <FilterChips pageInfo={pageInfo} />
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
              </>
            )}
            <span>{t('items.resultCount', { count: pageInfo.total ?? 0 })}</span>
            {pageInfo.costTime != null && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span>{t('items.queryTime', { ms: pageInfo.costTime })}</span>
              </>
            )}
          </div>
          {pageInfo.roleList && pageInfo.roleList.length > 0 && (
            <RelatedRoleButtons roleList={pageInfo.roleList} />
          )}
        </div>
      )}

      {/* Item Cards Grid */}
      {showInitialLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : !pageInfo?.list?.length ? (
        <div className="rounded-xl border border-border/40 bg-card/30 py-12 backdrop-blur-sm">
          <EmptyState title={t('items.empty.title')} description={t('items.empty.description')} />
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 transition-opacity duration-200 ${
            isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'
          }`}
        >
          {pageInfo.list.map((item, i) => <ItemCard key={item.id} item={item} index={i} />)}
        </div>
      )}

      {/* Pagination */}
      {pageInfo && (pageInfo.pages ?? 0) > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-border/40 pt-6">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 shadow-none text-xs font-medium"
            disabled={params.page <= 1}
            onClick={() => setParams({ page: params.page - 1 })}
          >
            <ChevronLeft className="mr-1 size-4" />
            {t('items.pagination.prev')}
          </Button>
          <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            {t('items.pagination.pageInfo', { page: params.page, totalPages: pageInfo.pages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 shadow-none text-xs font-medium"
            disabled={params.page >= (pageInfo.pages ?? 1)}
            onClick={() => setParams({ page: params.page + 1 })}
          >
            {t('items.pagination.next')}
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
