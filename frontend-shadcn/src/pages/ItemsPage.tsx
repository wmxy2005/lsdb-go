import { queryItemList } from '@/api/items';
import type { PageInfo } from '@/api/types';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageHeader } from '@/components/common/PageHeader';
import { ItemCard } from '@/components/ItemCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { CONFIG } from '@/constants/config';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, Eye, Tag, Calendar as CalendarIcon, Filter, Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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

  if (isError || (data && !data.success)) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const applyFilter = (updates: Partial<typeof params>) => {
    setParams({ ...updates, page: 1 });
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="资源档案库"
        description="浏览、检索和管理所有的系统资源和技术档案。"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
          >
            <RefreshCw className={`mr-2 size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
        }
      />

      {/* Control Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Base Categories */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">资源分类</span>
              <Select value={params.base ?? '__all__'} onValueChange={(v) => applyFilter({ base: v === '__all__' ? null : v })}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-indigo-500">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/40">
                  {CONFIG.resBaseList.map((b) => (
                    <SelectItem key={b.name || 'all'} value={b.name || '__all__'} className="text-xs rounded-md">{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Selection */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">排序方式</span>
              <Select value={params.sort ?? '__default__'} onValueChange={(v) => applyFilter({ sort: v === '__default__' ? null : v })}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-indigo-500">
                  <SelectValue placeholder="排序方式" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/40">
                  <SelectItem value="__default__" className="text-xs rounded-md">创建时间</SelectItem>
                  <SelectItem value="date" className="text-xs rounded-md">日期</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Favorites Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">我的收藏</span>
              <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-background/50 px-3 h-9 text-xs shadow-none">
                <Switch
                  id="favorites-toggle"
                  checked={params.favi === 'true'}
                  onCheckedChange={(c) => applyFilter({ favi: c ? 'true' : null })}
                  className="scale-90"
                />
                <Label htmlFor="favorites-toggle" className="cursor-pointer font-medium text-zinc-600 dark:text-zinc-300">
                  仅看收藏
                </Label>
              </div>
            </div>
          </div>

          {/* Resource Types Buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider self-start sm:self-end">展现类型</span>
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-zinc-100/50 dark:bg-zinc-900/30 p-1 h-9">
              {CONFIG.resTypeList.map((t) => {
                const isSelected = params.type === t.name || (!params.type && !t.name);
                return (
                  <Button
                    key={t.name || 'all'}
                    size="sm"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    className={`h-7 rounded-md px-3 text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/20'
                    }`}
                    onClick={() => applyFilter({ type: t.name || null })}
                  >
                    {t.label}
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
                <span>高级筛选选项</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-2 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="filter-keyword" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">关键词</Label>
                  <div className="relative">
                    <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input defaultValue={params.keyword ?? ''} id="filter-keyword" placeholder="英文分号分隔..." className="pl-8 h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none focus-visible:ring-indigo-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-tag" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">标签</Label>
                  <div className="relative">
                    <Tag className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input defaultValue={params.tag ?? ''} id="filter-tag" placeholder="精确标签搜索..." className="pl-8 h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none focus-visible:ring-indigo-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-category" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">分类</Label>
                  <div className="relative">
                    <SlidersHorizontal className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input defaultValue={params.category ?? ''} id="filter-category" placeholder="分类目录检索..." className="pl-8 h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none focus-visible:ring-indigo-500" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">逻辑匹配模式</Label>
                  <Select value={params.matchMode ?? '__and__'} onValueChange={(v) => setParams({ matchMode: v === '__and__' ? null : v })}>
                    <SelectTrigger className="h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-indigo-500 shadow-none">
                      <SelectValue placeholder="AND" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-border/40">
                      <SelectItem value="__and__" className="text-xs rounded-md">与 (AND)</SelectItem>
                      <SelectItem value="or" className="text-xs rounded-md">或 (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-from" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">发布开始日期</Label>
                  <Input type="date" defaultValue={params.dateFrom ?? ''} id="filter-date-from" className="h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-to" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">发布结束日期</Label>
                  <Input type="date" defaultValue={params.dateTo ?? ''} id="filter-date-to" className="h-9 bg-background/50 border-border/60 rounded-lg text-xs shadow-none focus-visible:ring-indigo-500" />
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
                  应用高级筛选
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Metadata & Related Roles */}
      {pageInfo && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 px-5 py-3 text-xs border border-border/40 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <span>找到档案：<strong className="font-semibold text-zinc-900 dark:text-zinc-100">{pageInfo.total ?? 0}</strong> 条</span>
            {pageInfo.costTime != null && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span>查询耗时 <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{pageInfo.costTime}</strong> ms</span>
              </>
            )}
          </div>
          {pageInfo.roleList && pageInfo.roleList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-400 dark:text-zinc-500 font-medium">相关角色：</span>
              <div className="flex flex-wrap gap-1.5">
                {pageInfo.roleList?.map((role) => (
                  <Button key={role.id} variant="secondary" size="sm" className="h-6 text-[10px] font-medium px-2.5 rounded-md border border-border/30 bg-background/50 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 transition-colors" asChild>
                    <Link to={`/items/role?id=${role.id}`}>{role.title}</Link>
                  </Button>
                ))}
              </div>
            </div>
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
          <EmptyState title="没有找到档案" description="尝试调整筛选条件或输入其他关键词" />
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
            上一页
          </Button>
          <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            第 {params.page} 页 / 共 {pageInfo.pages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 shadow-none text-xs font-medium"
            disabled={params.page >= (pageInfo.pages ?? 1)}
            onClick={() => setParams({ page: params.page + 1 })}
          >
            下一页
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
