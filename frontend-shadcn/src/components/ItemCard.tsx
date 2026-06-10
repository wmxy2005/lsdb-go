import type { ItemInfo } from '@/api/types';
import { faviItem } from '@/api/items';
import { ItemThumbnail } from '@/components/ItemThumbnail';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CONFIG } from '@/constants/config';
import { resolveBaseColor, resolveTagColor, resolveTagUrl, resolveUrl } from '@/lib/resource-url';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Calendar, Heart, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

function getBaseLabel(base?: string) {
  return CONFIG.resBaseList.find((b) => b.name === base)?.label ?? base ?? '';
}

function truncateTag(value: string) {
  const byteLen = new Blob([value]).size;
  if (byteLen <= 24) return { display: value, full: value };
  const sliceLen = Math.floor(24 / (byteLen / value.length));
  return { display: value.slice(0, sliceLen) + '...', full: value };
}

export function ItemCard({
  item,
  index = 0,
  onFaviChange,
}: {
  item: ItemInfo;
  index?: number;
  onFaviChange?: (itemId: number, isFavi: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isFavi, setIsFavi] = useState(item.isFavi ?? false);
  const [faviLoading, setFaviLoading] = useState(false);

  const thumbUrl = resolveUrl(item.base ?? '', item.category ?? '', item.subcategory ?? '', item.name ?? '', item.thumbnail ?? '');
  const rollUrl = item.roll?.trim()
    ? resolveUrl(item.base ?? '', item.category ?? '', item.subcategory ?? '', item.name ?? '', item.roll)
    : undefined;

  const tags = (item.tagList ?? []).filter((t) => !['base', 'tag2', 'tag3'].includes(t.type ?? '')).slice(0, 3);
  const baseLabel = getBaseLabel(item.base);
  const avatarUrl = item.avatarSrc ? `${CONFIG.apiUrl}${item.avatarSrc}` : undefined;
  const hasThumbDimensions = (item.thumbnailW ?? 0) > 0 && (item.thumbnailH ?? 0) > 0;
  const isMultiColumn = useMediaQuery('(min-width: 640px)');
  const thumbRef = useRef<HTMLAnchorElement>(null);
  const [thumbMaxH, setThumbMaxH] = useState<number | undefined>();

  useEffect(() => {
    if (!isMultiColumn) {
      setThumbMaxH(undefined);
      return;
    }
    const el = thumbRef.current;
    if (!el) return;

    const updateMaxH = (width: number) => setThumbMaxH(width);
    updateMaxH(el.getBoundingClientRect().width);

    const ro = new ResizeObserver(([entry]) => {
      updateMaxH(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMultiColumn]);

  const handleFavi = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.id || faviLoading) return;
    setFaviLoading(true);
    const res = await faviItem(item.id, isFavi);
    if (res.success) {
      const nextFavi = !isFavi;
      setIsFavi(nextFavi);
      onFaviChange?.(item.id, nextFavi);
    } else {
      toast.error(res.message ?? t('toast.operationFailed'));
    }
    setFaviLoading(false);
  };

  const handleTagClick = (e: React.MouseEvent, tagType: string, tagName: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(resolveTagUrl(tagType, tagName));
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.base) navigate(resolveTagUrl('base', item.base));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="group flex h-full flex-col overflow-hidden border-border bg-card py-0 gap-0 shadow-sm transition-all duration-300 hover:shadow-md hover:border-border/85">
        {/* Thumbnail area */}
        <Link
          ref={thumbRef}
          to={`/items/${item.id}`}
          style={thumbMaxH != null ? { maxHeight: thumbMaxH } : undefined}
          className={cn(
            'thumbnail__link relative block w-full overflow-hidden bg-muted',
            !hasThumbDimensions && 'aspect-video',
          )}
        >
          <ItemThumbnail
            src={thumbUrl}
            rollSrc={rollUrl}
            srcW={item.thumbnailW}
            srcH={item.thumbnailH}
            maxHeight={thumbMaxH}
          />
        </Link>

        {/* Content Details */}
        <div className="flex flex-1 flex-col px-3 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-full transition-transform duration-200 hover:scale-105"
              title={baseLabel}
              onClick={handleAvatarClick}
            >
              <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={item.avatar ?? item.base} />}
                <AvatarFallback
                  className="text-[10px] font-semibold text-white"
                  style={{ backgroundColor: resolveBaseColor(item.base ?? '') }}
                >
                  {item.avatar ?? item.base?.slice(0, 3)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
            <div className="flex h-[2.5rem] flex-1 items-center sm:h-[2.75rem]">
              <Link
                to={`/items/${item.id}`}
                className="line-clamp-2 w-full text-left text-sm font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-base"
              >
                {item.title || item.name}
              </Link>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-1.5">
            {tags.length > 0 && (
              <div className="flex flex-nowrap items-center gap-1.5 overflow-hidden py-1.5">
                {tags.map((tag, i) => {
                  const tagName = tag.value ?? tag.name ?? '';
                  const { display, full } = truncateTag(tagName);
                  const isLong = display !== full;
                  return (
                    <Badge
                      key={`${tag.type}-${tag.tagIndex ?? i}`}
                      variant="secondary"
                      title={isLong ? full : tagName}
                      className={`flex min-w-0 shrink items-center truncate cursor-pointer text-xs font-normal px-3 py-1 rounded-md border-none transition-all duration-200 hover:scale-[1.02] ${resolveTagColor(tag.type ?? 'tag', tag.index ?? tag.tagIndex ?? i)}`}
                      onClick={(e) => handleTagClick(e, tag.type ?? 'tag', tagName)}
                    >
                      {display}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Card Footer Divider */}
            <div className="flex items-center justify-between border-t pt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
              onClick={handleFavi}
              disabled={faviLoading}
            >
              {faviLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 transition-transform duration-200 active:scale-125 ${isFavi ? 'fill-destructive text-destructive' : ''}`} />
              )}
            </Button>
            {item.date && (
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <Calendar className="h-3.5 w-3.5 opacity-70" />
                <span>{String(item.date).slice(0, 10)}</span>
              </div>
            )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
