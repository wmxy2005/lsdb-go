import type { PageInfo, RoleListItem } from '@/api/types';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { ItemCard } from '@/components/ItemCard';
import { ItemsPagination } from '@/components/ItemsPagination';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClearableInput, clearNativeInput } from '@/components/ui/clearable-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import { CONFIG } from '@/constants';
import { useItemsListScroll } from '@/hooks/use-items-list-scroll';
import { useItemsPageData } from '@/hooks/use-items-page-data';
import { usePageTitle } from '@/hooks/use-page-title-context';
import { resBaseLabel, resTypeLabel } from '@/lib/i18n-labels';
import { buildItemsSearch, type ItemsUrlParams } from '@/lib/items-page-cache';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Tag, Filter, Search, RotateCcw, Folder, FolderTree } from 'lucide-react';
import { toast } from 'sonner';

const filterFieldFocus =
  'focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0';

const filterInputClass = `h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none ${filterFieldFocus}`;

const filterInputIconClass = `pl-8 ${filterInputClass}`;

const filterSelectClass = `h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium shadow-none ${filterFieldFocus}`;

const filterChipClass = 'h-6 text-[10px] font-medium px-2.5 rounded-md';

type ResBaseItem = (typeof CONFIG.resBaseList)[number];

function getGroupedResBases() {
  const childMap = new Map<string, ResBaseItem[]>();
  for (const item of CONFIG.resBaseList) {
    if (!item.parent) continue;
    const children = childMap.get(item.parent) ?? [];
    children.push(item);
    childMap.set(item.parent, children);
  }

  return CONFIG.resBaseList
    .filter((item) => !item.parent)
    .map((item) => ({
      item,
      children: item.name ? childMap.get(item.name) ?? [] : [],
    }));
}

function hasFilterChips(pageInfo: PageInfo) {
  return (
    (pageInfo.keyword?.length ?? 0) > 0 ||
    (pageInfo.category?.length ?? 0) > 0 ||
    (pageInfo.subcategory?.length ?? 0) > 0 ||
    (pageInfo.tag?.length ?? 0) > 0
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
            <Link to={`/items/role/${role.id}`}>
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
  const { t } = useTranslation();

  const handleCopy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('toast.copied'));
    } catch {
      toast.error(t('toast.operationFailed'));
    }
  };

  const copyableChipClass = `${filterChipClass} cursor-pointer transition-colors hover:bg-muted`;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pageInfo.keyword?.map((kw) => (
        <Badge
          key={`keyword-${kw}`}
          variant="outline"
          className={copyableChipClass}
          title={t('common.clickToCopy')}
          onClick={() => handleCopy(kw)}
        >
          {kw}
        </Badge>
      ))}
      {pageInfo.category?.map((cat) => (
        <Badge
          key={`category-${cat}`}
          variant="outline"
          className={`${copyableChipClass} border-red-500/30 text-red-600 dark:text-red-400`}
          title={cat}
          onClick={() => handleCopy(cat)}
        >
          {cat}
        </Badge>
      ))}
      {pageInfo.tag?.map((tag) => (
        <Badge
          key={`tag-${tag}`}
          variant="outline"
          className={`${copyableChipClass} border-emerald-500/30 text-emerald-600 dark:text-emerald-400`}
          title={tag}
          onClick={() => handleCopy(tag)}
        >
          {tag}
        </Badge>
      ))}
      {pageInfo.subcategory?.map((sub) => (
        <Badge
          key={`subcategory-${sub}`}
          variant="outline"
          className={copyableChipClass}
          title={sub}
          onClick={() => handleCopy(sub)}
        >
          {sub}
        </Badge>
      ))}
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 120,
      damping: 15,
    },
  },
};

function ItemCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Thumbnail area */}
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <Skeleton className="h-full w-full rounded-none" />
      </div>

      {/* Content Details */}
      <div className="flex flex-1 flex-col px-3 pt-2 pb-1.5 space-y-3">
        {/* Avatar + Title */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex h-[2.5rem] flex-1 flex-col justify-center gap-1.5">
            <Skeleton className="h-3.5 w-11/12 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
        </div>

        {/* Badges */}
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 py-1.5">
            <Skeleton className="h-5 w-12 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-10 rounded-md" />
          </div>

          {/* Footer Divider */}
          <div className="flex items-center justify-between border-t border-border/40 pt-1.5">
            <div className="flex items-center gap-1">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultsSummarySkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 px-5 py-3 text-xs border border-border/40 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-4 w-64 rounded" />
      </div>
    </div>
  );
}

const searchParsers = {
  keyword: parseAsString,
  category: parseAsString,
  subcategory: parseAsString,
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
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useQueryStates(searchParsers, { history: 'push' });
  const urlParams: ItemsUrlParams = useMemo(
    () => ({
      keyword: params.keyword,
      category: params.category,
      subcategory: params.subcategory,
      tag: params.tag,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      matchMode: params.matchMode,
      base: params.base,
      type: params.type,
      favi: params.favi,
      sort: params.sort,
      page: params.page,
      pageSize: params.pageSize,
    }),
    [
      params.keyword,
      params.category,
      params.subcategory,
      params.tag,
      params.dateFrom,
      params.dateTo,
      params.matchMode,
      params.base,
      params.type,
      params.favi,
      params.sort,
      params.page,
      params.pageSize,
    ],
  );
  const scrollKey = useMemo(
    () => `${location.key}${location.search}`,
    [location.key, location.search],
  );
  const groupedResBases = useMemo(() => getGroupedResBases(), []);

  // Date filters are controlled (custom locale-aware picker); seed from the URL
  // and resync whenever navigation changes them.
  const [dateFrom, setDateFrom] = useState(params.dateFrom ?? '');
  const [dateTo, setDateTo] = useState(params.dateTo ?? '');
  useEffect(() => setDateFrom(params.dateFrom ?? ''), [params.dateFrom]);
  useEffect(() => setDateTo(params.dateTo ?? ''), [params.dateTo]);

  const pushItemsSearch = useCallback(
    (updates: Partial<ItemsUrlParams>) => {
      const merged: ItemsUrlParams = { ...urlParams, ...updates };
      const search = buildItemsSearch(merged);
      navigate({ pathname: '/items', search }, { replace: false });
    },
    [navigate, urlParams],
  );

  const { data, pageInfo, isLoading, isError, shouldRestoreCache, refetch, persistPageData } =
    useItemsPageData(location);

  // Remember the last resolved title so re-reads (pagination/filter changes,
  // which briefly clear pageInfo) keep showing it instead of flashing back to
  // the page default. The default is only used on the very first load.
  const lastDocumentTitleRef = useRef<string | null>(null);
  const documentTitle = useMemo(() => {
    if (!pageInfo) return lastDocumentTitleRef.current ?? t('breadcrumb.itemsList');
    const rawTitle = pageInfo.title?.trim() ?? '';
    const info = rawTitle === 'all' || !rawTitle ? t('config.all') : rawTitle;
    const title = t('page.documentTitle', {
      info,
      page: pageInfo.current ?? urlParams.page,
      pages: Math.max(pageInfo.pages ?? 1, 1),
    });
    lastDocumentTitleRef.current = title;
    return title;
  }, [pageInfo, urlParams.page, t]);

  const breadcrumbLabel = pageInfo?.title?.trim() ? pageInfo.title : null;
  usePageTitle(documentTitle, breadcrumbLabel);

  useItemsListScroll(scrollKey, !!pageInfo && !isLoading, shouldRestoreCache);

  const handleFaviChange = useCallback(
    (itemId: number, isFavi: boolean) => {
      persistPageData((info) => ({
        ...info,
        list: info.list.map((item) =>
          item.id === itemId ? { ...item, isFavi } : item,
        ),
      }));
    },
    [persistPageData],
  );

  if (isError || (data && !data.success)) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const applyFilter = (updates: Partial<ItemsUrlParams>) => {
    pushItemsSearch({ ...updates, page: 1 });
  };

  const resetFilter = () => {
    for (const id of ['filter-keyword', 'filter-tag', 'filter-category', 'filter-subcategory']) {
      const el = document.getElementById(id) as HTMLInputElement | null;
      clearNativeInput(el);
    }
    setDateFrom('');
    setDateTo('');
    applyFilter({
      keyword: null,
      tag: null,
      category: null,
      subcategory: null,
      matchMode: null,
      dateFrom: null,
      dateTo: null,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Resource Types Buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider self-start">{t('items.filter.displayType')}</span>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-zinc-100/50 dark:bg-zinc-900/30 p-1 h-9">
              {CONFIG.resTypeList.map((typeItem) => {
                const isSelected = params.type === typeItem.name || (!params.type && !typeItem.name);
                return (
                  <Button
                    key={typeItem.name || 'all'}
                    size="sm"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    className={`h-7 rounded-md px-3 text-xs font-medium transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? 'bg-background text-primary font-semibold shadow-sm ring-1 ring-primary/20 hover:bg-background'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background hover:shadow-sm'
                    }`}
                    onClick={() => applyFilter({ type: typeItem.name || null })}
                  >
                    {resTypeLabel(t, typeItem.name)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Base Categories */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('items.filter.resourceCategory')}</span>
              <Select value={params.base ?? '__all__'} onValueChange={(v) => applyFilter({ base: v === '__all__' ? null : v })}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-primary">
                  <SelectValue placeholder={t('items.filter.allCategories')} />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/40">
                  {groupedResBases.map(({ item, children }) =>
                    children.length > 0 ? (
                      <SelectGroup key={item.name}>
                        <SelectLabel>{resBaseLabel(t, item.name)}</SelectLabel>
                        {children.map((child) => (
                          <SelectItem key={child.name} value={child.name} className="text-xs rounded-md pl-5">
                            {resBaseLabel(t, child.name)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : (
                      <SelectItem key={item.name || 'all'} value={item.name || '__all__'} className="text-xs rounded-md">
                        {resBaseLabel(t, item.name)}
                      </SelectItem>
                    ),
                  )}
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
                    <ClearableInput key={`filter-keyword-${params.keyword ?? ''}`} defaultValue={params.keyword ?? ''} id="filter-keyword" placeholder={t('items.filter.keywordPlaceholder')} className={filterInputIconClass} clearLabel={t('common.clear')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-tag" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.tag')}</Label>
                  <div className="relative">
                    <Tag className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <ClearableInput key={`filter-tag-${params.tag ?? ''}`} defaultValue={params.tag ?? ''} id="filter-tag" placeholder={t('items.filter.tagPlaceholder')} className={filterInputIconClass} clearLabel={t('common.clear')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-category" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.category')}</Label>
                  <div className="relative">
                    <Folder className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <ClearableInput key={`filter-category-${params.category ?? ''}`} defaultValue={params.category ?? ''} id="filter-category" placeholder={t('items.filter.categoryPlaceholder')} className={filterInputIconClass} clearLabel={t('common.clear')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-subcategory" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.subcategory')}</Label>
                  <div className="relative">
                    <FolderTree className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <ClearableInput key={`filter-subcategory-${params.subcategory ?? ''}`} defaultValue={params.subcategory ?? ''} id="filter-subcategory" placeholder={t('items.filter.subcategoryPlaceholder')} className={filterInputIconClass} clearLabel={t('common.clear')} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-from" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.dateFrom')}</Label>
                  <DatePicker
                    id="filter-date-from"
                    value={dateFrom}
                    onChange={setDateFrom}
                    locale={i18n.language}
                    placeholder={t('items.filter.datePlaceholder')}
                    todayLabel={t('items.filter.dateToday')}
                    clearLabel={t('items.filter.dateClear')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-to" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.dateTo')}</Label>
                  <DatePicker
                    id="filter-date-to"
                    value={dateTo}
                    onChange={setDateTo}
                    locale={i18n.language}
                    placeholder={t('items.filter.datePlaceholder')}
                    todayLabel={t('items.filter.dateToday')}
                    clearLabel={t('items.filter.dateClear')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('items.filter.matchMode')}</Label>
                  <Select value={params.matchMode ?? '__and__'} onValueChange={(v) => pushItemsSearch({ matchMode: v === '__and__' ? null : v })}>
                    <SelectTrigger className={filterSelectClass}>
                      <SelectValue placeholder="AND" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border/40">
                      <SelectItem value="__and__" className="text-xs rounded-md">{t('items.filter.matchAnd')}</SelectItem>
                      <SelectItem value="or" className="text-xs rounded-md">{t('items.filter.matchOr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-xs font-medium transition-all duration-200"
                  onClick={resetFilter}
                >
                  <RotateCcw className="mr-1.5 size-3.5" />
                  {t('items.filter.reset')}
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm"
                  onClick={() => {
                    const keyword = (document.getElementById('filter-keyword') as HTMLInputElement)?.value;
                    const tag = (document.getElementById('filter-tag') as HTMLInputElement)?.value;
                    const category = (document.getElementById('filter-category') as HTMLInputElement)?.value;
                    const subcategory = (document.getElementById('filter-subcategory') as HTMLInputElement)?.value;
                    applyFilter({
                      keyword: keyword || null,
                      tag: tag || null,
                      category: category || null,
                      subcategory: subcategory || null,
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
      {isLoading ? (
        <ResultsSummarySkeleton />
      ) : pageInfo ? (
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
      ) : null}

      {/* Item Cards Grid */}
      {isLoading ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {Array.from({ length: urlParams.pageSize }).map((_, i) => (
            <motion.div key={i} variants={itemVariants}>
              <ItemCardSkeleton />
            </motion.div>
          ))}
        </motion.div>
      ) : !pageInfo?.list?.length ? (
        <div className="rounded-xl border border-border/40 bg-card/30 py-12 backdrop-blur-sm">
          <EmptyState title={t('items.empty.title')} description={t('items.empty.description')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {pageInfo.list.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} onFaviChange={handleFaviChange} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pageInfo && (pageInfo.pages ?? 0) > 1 && (
        <ItemsPagination
          page={urlParams.page}
          totalPages={pageInfo.pages ?? 1}
          onPageChange={(page) => pushItemsSearch({ page })}
        />
      )}
    </div>
  );
}
