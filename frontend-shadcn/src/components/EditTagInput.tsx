import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Tag } from 'lucide-react';
import { useState } from 'react';

export function EditTagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const t = input.trim();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{label}</Label>
      
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-dashed border-border/60 bg-zinc-50/30 dark:bg-zinc-900/10">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pl-2.5 pr-1 py-0.5 h-6 text-xs rounded-md border-none bg-secondary/80 text-secondary-foreground font-medium transition-all duration-200">
              <Tag className="size-3 opacity-60" />
              <span>{tag}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-4 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-sm transition-colors text-muted-foreground hover:text-foreground"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
              >
                <X className="size-2.5" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic px-1">
          暂无关联标签，请在下方添加
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder={`添加新${label}`}
            className="pl-9 h-9 bg-background/50 border-border/60 rounded-lg text-xs"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={addTag}
          className="h-9 rounded-lg text-xs font-semibold px-3 border-border/60 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 flex items-center gap-1.5 transition-colors"
        >
          <Plus className="size-3.5" />
          添加
        </Button>
      </div>
    </div>
  );
}
