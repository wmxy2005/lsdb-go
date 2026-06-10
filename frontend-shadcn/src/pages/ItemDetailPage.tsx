import { openFolder } from '@/api/cmd';
import { faviItem, queryItem } from '@/api/items';
import type { ItemInfo } from '@/api/types';
import { ConsoleDialog } from '@/components/ConsoleDialog';
import { EditItemSheet } from '@/components/EditItemSheet';
import { PageActionButton, PageActions } from '@/components/common/PageActions';
import { ErrorState } from '@/components/common/ErrorState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePageTitle } from '@/hooks/use-page-title-context';
import { getItemsScrollContainer } from '@/lib/items-page-cache';
import { PHOTOSWIPE_DETAIL_OPTIONS } from '@/lib/photoswipe';
import { resolveTagColor, resolveTagUrl, resolveUrl } from '@/lib/resource-url';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Heart, Pencil, RefreshCw, Calendar, Tag, ChevronLeft, Film, Image as ImageIcon } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Gallery, Item as PsItem } from 'react-photoswipe-gallery';
import { toast } from 'sonner';
import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';

export default function ItemDetailPage() {
  const { t } = useTranslation();
  const { itemId } = useParams();
  const navigate = useNavigate();
  const id = Number(itemId);
  const [isFavi, setIsFavi] = useState<boolean | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['item', id],
    queryFn: () => queryItem(id),
    enabled: id > 0,
  });

  const item: ItemInfo | undefined = data?.success ? data.data : undefined;

  usePageTitle(item?.title, item?.title);

  useLayoutEffect(() => {
    getItemsScrollContainer()?.scrollTo({ top: 0, behavior: 'auto' });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  useEffect(() => {
    if (item) setIsFavi(!!item.isFavi);
  }, [item?.id, item?.isFavi]);

  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playerRef.current) return;
    const player = new Player({
        el: playerRef.current,
        fluid: true,
        volume: 0.2,
        poster: resolveUrl(
          item?.base ?? '',
          item?.category ?? '',
          item?.subcategory ?? '',
          item?.name ?? '',
          item?.videoThumbnail??'',
        ),
        url: resolveUrl(
          item?.base ?? '',
          item?.category ?? '',
          item?.subcategory ?? '',
          item?.name ?? '',
          item?.trailer ??'',
        ),
      });
    return () => {
      player?.pause();
      player?.destroy();
    };
  }, [item?.trailer]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="aspect-video w-full max-w-3xl rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data?.success || !item) {
    return <ErrorState onRetry={() => refetch()} />;
  }

  const faviState = isFavi ?? !!item.isFavi;

  const handleFavi = async () => {
    const res = await faviItem(id, faviState);
    if (res.success) {
      setIsFavi(!faviState);
      toast.success(!faviState ? t('toast.favoriteAdded') : t('toast.favoriteRemoved'));
    } else {
      toast.error(res.message ?? t('toast.operationFailed'));
    }
  };

  const handleOpenFolder = async () => {
    const path = [item.base, item.category, item.subcategory, item.name].filter(Boolean).join('/');
    const res = await openFolder(path);
    if (res.success) toast.success(t('toast.openFolderSuccess'));
    else toast.error(res.message ?? t('toast.openFolderFailed'));
  };

  const imgList1 = item.imgList1 ?? [];
  const imgList2 = item.imgList2 ?? [];

  const imageUrl = (img: { value?: string; name?: string }) =>
    resolveUrl(
      item.base ?? '',
      item.category ?? '',
      item.subcategory ?? '',
      item.name ?? '',
      img.value ?? img.name ?? '',
    );

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Back Button & Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            title={t('common.back')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
            {item.base && (
              <Link to={resolveTagUrl('base', item.base)} className="hover:text-foreground transition-colors">{item.base}</Link>
            )}
            {item.category && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">/</span>
                <span>{item.category}</span>
              </>
            )}
          </div>
        </div>

        <PageActions className="gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleFavi}
            className="h-9 w-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all duration-200"
            aria-label={faviState ? t('action.unfavorite') : t('action.favorite')}
          >
            <Heart className={`size-4 transition-transform duration-200 active:scale-125 ${faviState ? 'fill-destructive text-destructive' : 'text-zinc-500'}`} />
          </Button>
          <PageActionButton
            variant="outline"
            icon={<FolderOpen className="size-4" />}
            label={t('action.openFolder')}
            onClick={handleOpenFolder}
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs font-medium"
          />
          <PageActionButton
            variant="outline"
            icon={<RefreshCw className="size-4" />}
            label={t('action.sync')}
            onClick={() => setSyncOpen(true)}
            className="h-9 rounded-lg border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-xs font-medium"
          />
          <PageActionButton
            icon={<Pencil className="size-4" />}
            label={t('action.edit')}
            onClick={() => setEditOpen(true)}
            className="h-9 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm"
          />
        </PageActions>
      </div>

      {/* Main Title Section */}
      <div className="space-y-3">
        {item.title && (
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
            {item.title}
          </h1>
        )}
        {item.date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Calendar className="size-3.5 text-zinc-400" />
            <span>{t('common.publishedOn', { date: String(item.date).slice(0, 10) })}</span>
          </div>
        )}
      </div>

      {/* Text Content Description */}
      {item.content && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            <Pencil className="size-4" />
            <span>{t('itemDetail.section.description')}</span>
          </div>
          <Card className="border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl">
            <CardContent className="p-6">
              <div className="prose prose-content dark:prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                {item.content}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tags Grid */}
      {(item.tagList ?? []).length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {(item.tagList ?? []).map((tag, i) => {
            const tagName = (tag as { value?: string; name?: string }).value ?? (tag as { name?: string }).name ?? '';
            return (
              <Badge
                key={i}
                variant="secondary"
                className={`cursor-pointer text-xs px-3 py-1 rounded-md border-none transition-all duration-200 hover:scale-[1.02] ${resolveTagColor(tag.type ?? 'tag', tag.index ?? i)}`}
                onClick={() => navigate(resolveTagUrl(tag.type ?? 'tag', tagName))}
              >
                <Tag className="size-3 mr-1 opacity-70" />
                {tagName}
              </Badge>
            );
          })}
        </div>
      )}

      <Separator className="opacity-40" />

      {/* Media & Content Area */}
      <div className="space-y-8">
        {/* Video Trailer */}
        {item.trailer && (
          <div className="space-y-3 flex flex-col items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-full max-w-3xl">
              <Film className="size-4" />
              <span>{t('itemDetail.section.trailer')}</span>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-border/40 bg-zinc-950 shadow-lg w-full max-w-3xl aspect-video">
              <div className="w-full h-full object-contain">
                <div ref={playerRef} />
              </div>
            </div>
          </div>
        )}

        {/* Image Gallery 1 (Lightbox Grid) */}
        {imgList1.length > 0 && (
          <div className="space-y-3 flex flex-col items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider w-full justify-center">
              <ImageIcon className="size-4" />
              <span>{t('itemDetail.section.gallery')}</span>
            </div>
            <div className="w-full">
              <Gallery options={PHOTOSWIPE_DETAIL_OPTIONS}>
                <div className="flex flex-wrap justify-center gap-4 w-full">
                  {imgList1.map((img, i) => {
                    const src = imageUrl(img);
                    return (
                      <PsItem
                        key={img.imgIndex ?? i}
                        original={src}
                        thumbnail={src}
                        width={img.width ?? img.w ?? 1200}
                        height={img.height ?? img.h ?? 800}
                      >
                        {({ ref, open }) => (
                          <div
                            className="overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-shadow duration-300 hover:shadow-md cursor-pointer max-w-full"
                            onClick={open}
                            onKeyDown={(e) => e.key === 'Enter' && open()}
                            role="button"
                            tabIndex={0}
                          >
                            <img
                              ref={ref as React.RefObject<HTMLImageElement>}
                              src={src}
                              alt=""
                              className="max-h-[75vh] w-auto max-w-full object-contain"
                              loading="lazy"
                            />
                          </div>
                        )}
                      </PsItem>
                    );
                  })}
                </div>
              </Gallery>
            </div>
          </div>
        )}

        {/* Image Gallery 2 (Masonry Columns) */}
        {imgList2.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <ImageIcon className="size-4" />
              <span>{t('itemDetail.section.detailImages')}</span>
            </div>
            <div className="columns-3 gap-1 sm:columns-4 md:columns-6 lg:columns-8 space-y-1">
              {imgList2.map((img, i) => {
                const w = img.width ?? img.w;
                const h = img.height ?? img.h;
                const aspectRatioStyle = w && h && w > 0 && h > 0 ? { aspectRatio: `${w} / ${h}` } : undefined;
                return (
                  <div
                    key={img.imgIndex ?? i}
                    style={aspectRatioStyle}
                    className="break-inside-avoid overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01]"
                  >
                    <img
                      src={imageUrl(img)}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-102"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <EditItemSheet itemId={id} open={editOpen} onOpenChange={setEditOpen} onSaved={() => refetch()} />
      <ConsoleDialog
        open={syncOpen}
        onOpenChange={setSyncOpen}
        path={[item.base, item.category, item.subcategory, item.name].filter(Boolean).join('/')}
      />
    </div>
  );
}
