import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { resolveUrl } from '@/lib/resource-url';

import { Film, Image as ImageIcon, Eye, PlayCircle, X } from 'lucide-react';

import { useTranslation } from 'react-i18next';

import { isVideoFile, useMediaPreview } from '@/components/edit/MediaPreview';



function EmptyPreviewTile({ label }: { label: string }) {

  return (

    <div className="bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-400 dark:text-zinc-500 flex h-28 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs italic">

      {label}

    </div>

  );

}



function ThumbnailPreviewTile({

  filename,

  base,

  category,

  subcategory,

  name,

  onPreview,

  previewLabel,

}: {

  filename: string;

  base: string;

  category: string;

  subcategory: string;

  name: string;

  onPreview: (e: React.MouseEvent) => void;

  previewLabel: string;

}) {

  const url = resolveUrl(base, category, subcategory, name, filename);



  if (isVideoFile(filename)) {

    return (

      <div className="group relative flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-zinc-950 shadow-sm transition-all duration-300 hover:shadow-md">

        <PlayCircle className="size-10 text-white/70" />

        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">

          <Button

            type="button"

            variant="secondary"

            size="icon"

            className="size-7 rounded-lg pointer-events-auto shadow-sm"

            onClick={onPreview}

            title={previewLabel}

          >

            <Eye className="size-3.5" />

          </Button>

        </div>

      </div>

    );

  }



  return (

    <div className="group relative h-28 w-full overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md">

      <img src={url} alt={filename} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />

      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">

        <Button

          type="button"

          variant="secondary"

          size="icon"

          className="size-7 rounded-lg pointer-events-auto shadow-sm"

          onClick={onPreview}

          title={previewLabel}

        >

          <Eye className="size-3.5" />

        </Button>

      </div>

    </div>

  );

}



function VideoAssetPreviewTile({

  filename,

  onPreview,

  previewLabel,

  notSelectedLabel,

}: {

  filename: string;

  onPreview: (e: React.MouseEvent) => void;

  previewLabel: string;

  notSelectedLabel: string;

}) {

  if (!filename) {

    return <EmptyPreviewTile label={notSelectedLabel} />;

  }



  return (

    <div className="group relative h-28 w-full overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md">

      <img src="/video.svg" alt="" className="h-full w-full object-contain p-4 opacity-90" />

      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">

        <Button

          type="button"

          variant="secondary"

          size="icon"

          className="size-7 rounded-lg pointer-events-auto shadow-sm"

          onClick={onPreview}

          title={previewLabel}

        >

          <Eye className="size-3.5" />

        </Button>

      </div>

    </div>

  );

}



export function EditMediaSection({

  fileList,

  thumbnail,

  roll,

  trailer,

  onThumbnailChange,

  onRollChange,

  onTrailerChange,

  base,

  category,

  subcategory,

  name,

}: {

  fileList: string[];

  thumbnail: string;

  roll: string;

  trailer: string;

  onThumbnailChange: (v: string) => void;

  onRollChange: (v: string) => void;

  onTrailerChange: (v: string) => void;

  base: string;

  category: string;

  subcategory: string;

  name: string;

}) {

  const { t } = useTranslation();

  const { openMediaPreview } = useMediaPreview();



  const preview = (filename: string, kind: 'auto' | 'video' | 'image' = 'auto') => {

    if (!filename) return;

    openMediaPreview({ filename, base, category, subcategory, name, kind });

  };



  const handlePreviewClick = (filename: string, kind: 'auto' | 'video' | 'image' = 'auto') => (e: React.MouseEvent) => {

    e.preventDefault();

    e.stopPropagation();

    preview(filename, kind);

  };



  if (fileList.length === 0) {

    return (

      <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-border/60 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">

        <ImageIcon className="size-7 text-zinc-300 dark:text-zinc-700 mb-2" />

        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{t('edit.noResourcesHint')}</p>

      </div>

    );

  }



  const fields = [

    { shortKey: 'edit.media.thumbnailShort', value: thumbnail, onChange: onThumbnailChange, icon: ImageIcon },

    { shortKey: 'edit.media.rollShort', value: roll, onChange: onRollChange, icon: PlayCircle },

    { shortKey: 'edit.media.trailerShort', value: trailer, onChange: onTrailerChange, icon: Film },

  ] as const;



  const rollShort = t('edit.media.rollShort');

  const trailerShort = t('edit.media.trailerShort');



  return (

    <div className="space-y-6">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {fields.map(({ shortKey, value, onChange, icon: Icon }) => (

          <div key={shortKey} className="min-w-0 space-y-1.5">

            <Label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">

              <Icon className="size-3.5 text-zinc-400" />

              <span>{t(shortKey)}</span>

            </Label>

            <div className="relative min-w-0">

              <Select value={value} onValueChange={onChange}>

                <SelectTrigger

                  className={`h-9 w-full min-w-0 justify-start gap-0.5 overflow-hidden bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-primary shadow-none [&>span:first-child]:min-w-0 [&>span:first-child]:flex-1 [&>span:first-child]:overflow-hidden [&>span:first-child_span]:block [&>span:first-child_span]:w-full [&>span:first-child_span]:truncate [&>span:first-child_span]:text-left ${value ? 'pr-8' : ''}`}

                >

                  <span className="min-w-0 flex-1 basis-0 overflow-hidden">

                    <SelectValue placeholder={t('edit.media.selectFile')} />

                  </span>

                </SelectTrigger>

                <SelectContent className="rounded-lg border-border/40 min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(24rem,calc(100vw-2rem))]">

                  {fileList.map((f) => (

                    <SelectItem key={f} value={f} className="text-xs rounded-md whitespace-normal break-all">

                      {f}

                    </SelectItem>

                  ))}

                </SelectContent>

              </Select>

              {value && (

                <button

                  type="button"

                  aria-label={t('edit.media.clearSelection')}

                  className="absolute right-8 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"

                  onPointerDown={(e) => e.preventDefault()}

                  onClick={(e) => {

                    e.stopPropagation();

                    onChange('');

                  }}

                >

                  <X className="size-3.5" />

                </button>

              )}

            </div>

          </div>

        ))}

      </div>



      <div className="space-y-2">

        <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-0.5">

          {t('edit.media.hoverPreviewHint')}

        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="space-y-1.5">

            <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{t('edit.media.thumbnailShort')}</p>

            {thumbnail ? (

              <ThumbnailPreviewTile

                filename={thumbnail}

                base={base}

                category={category}

                subcategory={subcategory}

                name={name}

                onPreview={handlePreviewClick(thumbnail)}

                previewLabel={t('common.preview')}

              />

            ) : (

              <EmptyPreviewTile label={t('edit.media.notSelectedThumbnail')} />

            )}

          </div>

          <div className="space-y-1.5">

            <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{rollShort}</p>

            <VideoAssetPreviewTile

              filename={roll}

              onPreview={handlePreviewClick(roll, 'video')}

              previewLabel={t('common.preview')}

              notSelectedLabel={t('edit.media.notSelected', { label: rollShort })}

            />

          </div>

          <div className="space-y-1.5">

            <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{trailerShort}</p>

            <VideoAssetPreviewTile

              filename={trailer}

              onPreview={handlePreviewClick(trailer, 'video')}

              previewLabel={t('common.preview')}

              notSelectedLabel={t('edit.media.notSelected', { label: trailerShort })}

            />

          </div>

        </div>

      </div>

    </div>

  );

}

