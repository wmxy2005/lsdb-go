import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveUrl } from '@/lib/resource-url';
import { Film, Image as ImageIcon, Eye, PlayCircle } from 'lucide-react';

const VIDEO_EXT = /\.(mp4|webm|mov|mkv|avi)$/i;

function isVideo(filename: string) {
  return VIDEO_EXT.test(filename);
}

function MediaPreview({
  filename,
  base,
  category,
  subcategory,
  name,
}: {
  filename: string;
  base: string;
  category: string;
  subcategory: string;
  name: string;
}) {
  const url = resolveUrl(base, category, subcategory, name, filename);
  if (isVideo(filename)) {
    return (
      <div className="relative h-28 w-full rounded-lg border border-border/40 overflow-hidden bg-zinc-950 flex items-center justify-center group">
        <video
          src={url}
          muted
          controls
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20 pointer-events-none flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-300">
          <PlayCircle className="size-8 text-white/80" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative h-28 w-full rounded-lg border border-border/40 overflow-hidden bg-muted group">
      <img
        src={url}
        alt={filename}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <span className="text-[10px] font-medium text-white bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">预览图</span>
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
  if (fileList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-border/60 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
        <ImageIcon className="size-7 text-zinc-300 dark:text-zinc-700 mb-2" />
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">暂无可用资源文件，请先在下方上传资源文件</p>
      </div>
    );
  }

  const fields = [
    { label: '主缩略图 (Thumbnail)', value: thumbnail, onChange: onThumbnailChange, icon: ImageIcon },
    { label: '悬浮预览 (Roll)', value: roll, onChange: onRollChange, icon: PlayCircle },
    { label: '预告视频 (Trailer)', value: trailer, onChange: onTrailerChange, icon: Film },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Selectors Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {fields.map(({ label, value, onChange, icon: Icon }) => (
          <div key={label} className="space-y-1.5">
            <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Icon className="size-3.5 text-zinc-400" />
              <span>{label.split(' ')[0]}</span>
            </Label>
            <Select value={value || undefined} onValueChange={onChange}>
              <SelectTrigger className="h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-indigo-500 shadow-none">
                <SelectValue placeholder="选择关联文件" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border/40 max-w-[240px]">
                {fileList.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs rounded-md truncate">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      {/* Previews Grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          <Eye className="size-3.5" />
          <span>媒体资源实时预览</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {fields.map(({ label, value }) => (
            <div key={`preview-${label}`} className="space-y-1.5">
              <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">{label.split(' ')[0]} 预览</p>
              {value ? (
                <MediaPreview
                  filename={value}
                  base={base}
                  category={category}
                  subcategory={subcategory}
                  name={name}
                />
              ) : (
                <div className="bg-zinc-50/50 dark:bg-zinc-900/10 text-zinc-400 dark:text-zinc-500 flex h-28 items-center justify-center rounded-lg border border-dashed border-border/60 text-xs italic">
                  未选择关联文件
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
