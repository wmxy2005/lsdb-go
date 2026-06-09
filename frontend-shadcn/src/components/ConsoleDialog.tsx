import { syncFolder } from '@/api/cmd';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type LogLine = { time: string; text: string; type?: string };

export function ConsoleDialog({
  open,
  onOpenChange,
  path,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
}) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !path) return;
    let active = true;
    setLines([]);
    setRunning(true);

    (async () => {
      const res = await syncFolder(path);
      if (!active) return;
      const now = new Date().toLocaleTimeString();
      if (res.success) {
        setLines((prev) => [...prev, { time: now, text: res.data ?? t('sync.success'), type: 'success' }]);
      } else {
        setLines((prev) => [...prev, { time: now, text: res.message ?? t('sync.failed'), type: 'error' }]);
      }
      setRunning(false);
    })();

    return () => { active = false; };
  }, [open, path, t]);

  useEffect(() => {
    const viewport = scrollRef.current?.parentElement;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [lines]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('sync.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-64 rounded-md border font-mono text-xs">
          <div ref={scrollRef} className="p-3">
            {lines.map((line, i) => (
              <div key={i} className={line.type === 'error' ? 'text-destructive' : line.type === 'success' ? 'text-green-600' : ''}>
                [{line.time}] {line.text}
              </div>
            ))}
            {running && <div className="text-muted-foreground">{t('sync.inProgress')}</div>}
          </div>
        </ScrollArea>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
