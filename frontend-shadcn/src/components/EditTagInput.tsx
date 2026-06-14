import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClearableInput } from '@/components/ui/clearable-input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { X, Plus, Tag, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function EditTagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const addTag = () => {
    const tag = input.trim();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
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
      onChange(reorderList(tags, from, index));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</Label>

      {tags.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 px-0.5">
            {t('edit.tag.dragHint')}
          </p>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-dashed border-border/60 bg-zinc-50/30 dark:bg-zinc-900/10">
            {tags.map((tag, index) => (
              <div
                key={tag}
                className={cn(
                  'transition-opacity duration-200',
                  dragIndex === index && 'opacity-40',
                  dragOverIndex === index && 'ring-2 ring-primary ring-offset-1 ring-offset-background rounded-md',
                )}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
              >
                <Badge
                  variant="secondary"
                  className="gap-1 pl-1 pr-1 py-0.5 h-6 text-xs rounded-md border-none bg-secondary/80 text-secondary-foreground font-medium transition-all duration-200"
                >
                  <span
                    draggable
                    onDragStart={handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    title={t('common.dragToReorder')}
                    className="flex size-4 shrink-0 cursor-grab items-center justify-center rounded-sm text-muted-foreground hover:bg-zinc-200/80 dark:hover:bg-zinc-800/80 active:cursor-grabbing"
                  >
                    <GripVertical className="size-3" />
                  </span>
                  <Tag className="size-3 opacity-60" />
                  <span>{tag}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-4 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm transition-colors text-muted-foreground hover:text-foreground"
                    onClick={() => onChange(tags.filter((item) => item !== tag))}
                  >
                    <X className="size-2.5" />
                  </Button>
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic px-1">
          {t('edit.tag.empty')}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
          <ClearableInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder={t('edit.tag.addPlaceholder', { label })}
            className="pl-9 h-9 bg-background/50 border-border/60 rounded-lg text-xs"
            clearLabel={t('common.clear')}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          className="h-9 rounded-lg text-xs font-semibold px-3 border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center gap-1.5 transition-colors"
        >
          <Plus className="size-3.5" />
          {t('common.add')}
        </Button>
      </div>
    </div>
  );
}
