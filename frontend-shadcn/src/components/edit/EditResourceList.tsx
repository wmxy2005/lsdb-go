import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Upload, Trash2, File, Film, Image as ImageIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type FileOption = { name: string; type?: string };

export function EditResourceList({
  files,
  onDelete,
  onUpload,
}: {
  files: FileOption[];
  onDelete: (filename: string) => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const getTypeLabel = (type?: string) => {
    if (type === 'thumbnail') return t('edit.resource.type.thumbnail');
    if (type === 'image') return t('edit.resource.type.image');
    if (type === 'file') return t('edit.resource.type.file');
    return type;
  };

  const getFileIcon = (type?: string) => {
    if (type === 'thumbnail') return <ImageIcon className="size-4 text-emerald-500" />;
    if (type === 'image') return <ImageIcon className="size-4 text-indigo-500" />;
    if (type === 'file') return <Film className="size-4 text-violet-500" />;
    return <File className="size-4 text-zinc-400" />;
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    for (const file of Array.from(fileList)) {
      await onUpload(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const dropped = e.dataTransfer.files;
    if (dropped.length > 0) {
      await uploadFiles(dropped);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected?.length) {
      await uploadFiles(selected);
    }
    e.target.value = '';
  };

  return (
    <div
      className={cn(
        'space-y-5 rounded-xl border border-dashed border-transparent p-1 transition-colors',
        isDragging && 'border-primary/50 bg-primary/5',
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {files.length > 0 ? (
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {files.map((f) => (
            <div
              key={f.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-zinc-50/30 dark:bg-zinc-900/10 px-4 py-2.5 text-xs transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-900/20"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-background border border-border/40 shrink-0">
                  {getFileIcon(f.type)}
                </div>
                <span className="truncate font-mono text-zinc-700 dark:text-zinc-300 font-medium">{f.name}</span>
                {f.type && (
                  <Badge variant="outline" className="shrink-0 text-[10px] font-semibold px-2 py-0 h-5 border-border/60 bg-background/50 text-zinc-500 dark:text-zinc-400 rounded-md">
                    {getTypeLabel(f.type)}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                onClick={() => onDelete(f.name)}
                title={t('edit.resource.delete')}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center py-8 border border-dashed border-border/60 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
          <File className="size-7 text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{t('edit.resource.empty')}</p>
          <p className="mt-1 text-[10px] text-muted-foreground">{t('edit.resource.dropHint')}</p>
        </div>
      )}

      <div className="space-y-2 border-t border-border/30 pt-4">
        <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('edit.resource.uploadLabel')}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-9 rounded-lg text-xs font-semibold px-4 border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center gap-1.5 transition-colors"
          >
            <Upload className="size-3.5" />
            {t('edit.resource.selectAndUpload')}
          </Button>
          <span className="text-[10px] text-muted-foreground">{t('edit.resource.orDragHint')}</span>
        </div>
      </div>
    </div>
  );
}
