import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PHOTOSWIPE_OPTIONS } from '@/lib/photoswipe';
import { resolveUrl } from '@/lib/resource-url';
import { cn } from '@/lib/utils';
import { Plus, X, Image as ImageIcon, Eye, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gallery, Item as PsItem } from 'react-photoswipe-gallery';

type ImageSize = { width?: number; height?: number };

function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function EditGalleryImageItem({
  filename,
  src,
  index,
  initialSize,
  isDragging,
  isDragOver,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  filename: string;
  src: string;
  index: number;
  initialSize?: ImageSize;
  isDragging: boolean;
  isDragOver: boolean;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const { t } = useTranslation();
  const [size, setSize] = useState({
    width: initialSize?.width && initialSize.width > 0 ? initialSize.width : 1200,
    height: initialSize?.height && initialSize.height > 0 ? initialSize.height : 800,
  });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setSize({ width: naturalWidth, height: naturalHeight });
    }
  };

  return (
    <div
      className={cn(
        'relative transition-opacity duration-200',
        isDragging && 'opacity-40',
        isDragOver && 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <PsItem original={src} thumbnail={src} width={size.width} height={size.height} cropped>
        {({ ref, open }) => (
          <div className="group relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md">
            <div
              draggable
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              title={t('common.dragToReorder')}
              className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-grab items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            >
              <GripVertical className="size-3.5" />
            </div>

            <button
              type="button"
              className="size-full cursor-pointer overflow-hidden"
              onClick={open}
              title={t('edit.gallery.clickToPreview')}
            >
              <img
                ref={ref as unknown as React.Ref<HTMLImageElement>}
                src={src}
                alt={filename}
                onLoad={handleImageLoad}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </button>

            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 pointer-events-none">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="size-7 rounded-lg pointer-events-auto shadow-sm"
                onClick={open}
                title={t('common.preview')}
              >
                <Eye className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="size-7 rounded-lg pointer-events-auto shadow-sm"
                onClick={onRemove}
                title={t('edit.gallery.removeFromGallery')}
              >
                <X className="size-3.5" />
              </Button>
            </div>

            <span className="bg-black/60 text-white backdrop-blur-sm absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate px-2 py-0.5 rounded-md text-[9px] font-medium font-mono">
              {index + 1}. {filename}
            </span>
          </div>
        )}
      </PsItem>
    </div>
  );
}

export function EditImageList({
  imgList,
  onChange,
  imageSizes,
  availableFiles,
  base,
  category,
  subcategory,
  name,
}: {
  imgList: string[];
  onChange: (imgList: string[]) => void;
  imageSizes?: Record<string, ImageSize>;
  availableFiles: string[];
  base: string;
  category: string;
  subcategory: string;
  name: string;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addable = availableFiles.filter((f) => !imgList.includes(f));

  const handleAdd = () => {
    if (!selected || imgList.includes(selected)) return;
    onChange([...imgList, selected]);
    setSelected('');
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDragIndex(index);
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(from) && from !== index) {
      onChange(reorderList(imgList, from, index));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  if (availableFiles.length === 0 && imgList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-border/60 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
        <ImageIcon className="size-7 text-zinc-300 dark:text-zinc-700 mb-2" />
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{t('edit.noResourcesHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {imgList.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-0.5">
            {t('edit.gallery.dragHandleHint')}
          </p>
          <Gallery options={PHOTOSWIPE_OPTIONS}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {imgList.map((img, index) => {
                const src = resolveUrl(base, category, subcategory, name, img);
                return (
                  <EditGalleryImageItem
                    key={img}
                    filename={img}
                    src={src}
                    index={index}
                    initialSize={imageSizes?.[img]}
                    isDragging={dragIndex === index}
                    isDragOver={dragOverIndex === index}
                    onRemove={() => onChange(imgList.filter((i) => i !== img))}
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver(index)}
                    onDrop={handleDrop(index)}
                  />
                );
              })}
            </div>
          </Gallery>
        </div>
      ) : (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 italic px-1">
          {t('edit.gallery.empty')}
        </div>
      )}

      {addable.length > 0 && (
        <div className="flex gap-2 border-t border-border/30 pt-4">
          <div className="min-w-0 flex-1">
            <Label className="sr-only">{t('edit.gallery.addImage')}</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9 w-full min-w-0 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-primary shadow-none [&>span]:min-w-0 [&>span]:truncate [&>span]:text-left">
                <SelectValue placeholder={t('edit.gallery.selectFilePlaceholder')} />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border/40 min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(24rem,calc(100vw-2rem))]">
                {addable.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs rounded-md whitespace-normal break-all">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold px-3 border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center gap-1.5 transition-colors"
            onClick={handleAdd}
            disabled={!selected}
          >
            <Plus className="size-3.5" />
            {t('edit.gallery.addToGallery')}
          </Button>
        </div>
      )}
    </div>
  );
}
