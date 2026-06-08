import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resolveUrl } from '@/lib/resource-url';
import { Plus, X, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function EditImageList({
  images,
  onChange,
  availableFiles,
  base,
  category,
  subcategory,
  name,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  availableFiles: string[];
  base: string;
  category: string;
  subcategory: string;
  name: string;
}) {
  const [selected, setSelected] = useState('');

  const addable = availableFiles.filter((f) => !images.includes(f));

  const handleAdd = () => {
    if (!selected || images.includes(selected)) return;
    onChange([...images, selected]);
    setSelected('');
  };

  const handlePreview = (filename: string) => {
    const url = resolveUrl(base, category, subcategory, name, filename);
    window.open(url, '_blank');
  };

  if (availableFiles.length === 0 && images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-border/60 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
        <ImageIcon className="size-7 text-zinc-300 dark:text-zinc-700 mb-2" />
        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">暂无可用资源文件，请先在下方上传资源文件</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div key={img} className="group relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted shadow-sm transition-all duration-300 hover:shadow-md">
              <button
                type="button"
                className="size-full cursor-pointer overflow-hidden"
                onClick={() => handlePreview(img)}
                title="点击查看原图"
              >
                <img
                  src={resolveUrl(base, category, subcategory, name, img)}
                  alt={img}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </button>
              
              {/* Hover overlay with action buttons */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 pointer-events-none">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-7 rounded-lg pointer-events-auto shadow-sm"
                  onClick={() => handlePreview(img)}
                  title="在新窗口打开"
                >
                  <ExternalLink className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="size-7 rounded-lg pointer-events-auto shadow-sm"
                  onClick={() => onChange(images.filter((i) => i !== img))}
                  title="从图集移除"
                >
                  <X className="size-3.5" />
                </Button>
              </div>

              {/* Tag filename */}
              <span className="bg-black/60 text-white backdrop-blur-sm absolute bottom-1.5 left-1.5 max-w-[calc(100%-12px)] truncate px-2 py-0.5 rounded-md text-[9px] font-medium font-mono">
                {img}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-400 dark:text-zinc-500 italic px-1">
          暂无关联图集图片，请在下方选择文件添加
        </div>
      )}

      {addable.length > 0 && (
        <div className="flex gap-2 border-t border-border/30 pt-4">
          <div className="flex-1 space-y-1.5">
            <Label className="sr-only">添加图片</Label>
            <Select value={selected || undefined} onValueChange={setSelected}>
              <SelectTrigger className="h-9 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-indigo-500 shadow-none">
                <SelectValue placeholder="选择未关联文件添加至图集" />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-border/40 max-w-[320px]">
                {addable.map((f) => (
                  <SelectItem key={f} value={f} className="text-xs rounded-md truncate">
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
            添加至图集
          </Button>
        </div>
      )}
    </div>
  );
}
