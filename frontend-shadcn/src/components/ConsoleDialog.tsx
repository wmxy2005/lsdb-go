import { getSyncTaskStreamUrl, startSyncTask, type SyncItemParams } from '@/api/cmd';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type LogLine = { time: string; text: string; type?: string };
type SyncStreamPayload = { time?: string; text?: string; message?: string };

function appendOutputLines(
  prev: LogLine[],
  time: string,
  text: string | undefined,
  type?: string,
) {
  const normalized = (text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parts = normalized
    .split('\n')
    .map((part) => part.trimEnd())
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return prev;
  }

  return [...prev, ...parts.map((part) => ({ time, text: part, type }))];
}

export function ConsoleDialog({
  open,
  onOpenChange,
  syncTarget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncTarget?: SyncItemParams;
}) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<LogLine[]>([]);
  const [running, setRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !syncTarget) return;
    let active = true;
    let terminal = false;
    let es: EventSource | null = null;
    setLines([]);
    setRunning(true);

    (async () => {
      const now = new Date().toLocaleTimeString();
      setLines([
        {
          time: now,
          text: `${t('sync.inProgress')} ${syncTarget.base}/${syncTarget.category}/${syncTarget.item}`,
        },
      ]);

      const res = await startSyncTask(syncTarget);
      if (!active) return;

      if (!res.success || !res.data?.processId) {
        const finishTime = new Date().toLocaleTimeString();
        setLines((prev) => appendOutputLines(prev, finishTime, res.message ?? t('sync.failed'), 'error'));
        setRunning(false);
        return;
      }

      es = new EventSource(getSyncTaskStreamUrl(res.data.processId), { withCredentials: true });

      const handleEvent = (eventType: 'log' | 'done' | 'error') => (event: MessageEvent) => {
        let payload: SyncStreamPayload | null = null;
        try {
          payload = JSON.parse(event.data) as SyncStreamPayload;
        } catch {
          return;
        }
        if (!active || !payload) return;
        const time = payload.time || new Date().toLocaleTimeString();
        if (eventType === 'done') {
          setLines((prev) => appendOutputLines(prev, time, '已完成', 'success'));
        } else {
          const text = payload.text ?? payload.message ?? '';
          const lineType = eventType === 'log' ? undefined : 'error';
          setLines((prev) => appendOutputLines(prev, time, text, lineType));
        }
        if (eventType !== 'log') {
          terminal = true;
          setRunning(false);
          es?.close();
        }
      };

      es.addEventListener('log', handleEvent('log'));
      es.addEventListener('done', handleEvent('done'));
      es.addEventListener('error', handleEvent('error'));
      es.onerror = () => {
        if (!active || terminal) return;
        const finishTime = new Date().toLocaleTimeString();
        setLines((prev) => appendOutputLines(prev, finishTime, t('sync.failed'), 'error'));
        setRunning(false);
        es?.close();
      };
    })();

    return () => {
      active = false;
      es?.close();
    };
  }, [open, syncTarget, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
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
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.close')}</Button>
      </DialogContent>
    </Dialog>
  );
}
