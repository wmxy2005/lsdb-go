import { getSyncTaskStreamUrl, startSyncTask, type SyncItemParams } from '@/api/cmd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CheckCircle2, LoaderCircle, Maximize2, Minimize2, ServerCrash, TerminalSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type LogLine = { time: string; text: string; type?: 'success' | 'error' };
type SyncStreamPayload = { time?: string; text?: string; message?: string };
type ConsoleStatus = 'idle' | 'running' | 'success' | 'error';

function appendOutputLines(
  prev: LogLine[],
  time: string,
  text: string | undefined,
  type?: 'success' | 'error',
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

function statusPresentation(t: ReturnType<typeof useTranslation>['t'], status: ConsoleStatus) {
  switch (status) {
    case 'running':
      return {
        label: t('sync.status.running', 'Running'),
        description: t('sync.description.running', 'Streaming live output from the sync task.'),
        icon: <LoaderCircle className="size-3.5 animate-spin" />,
        badgeClassName:
          'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        panelClassName: 'ring-1 ring-emerald-500/15',
      };
    case 'success':
      return {
        label: t('sync.status.completed', 'Completed'),
        description: t('sync.description.completed', 'The sync task finished successfully.'),
        icon: <CheckCircle2 className="size-3.5" />,
        badgeClassName:
          'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        panelClassName: 'ring-1 ring-emerald-500/20',
      };
    case 'error':
      return {
        label: t('sync.status.failed', 'Failed'),
        description: t('sync.description.failed', 'The sync task ended with an error.'),
        icon: <ServerCrash className="size-3.5" />,
        badgeClassName:
          'border-destructive/20 bg-destructive/10 text-destructive dark:text-red-300',
        panelClassName: 'ring-1 ring-destructive/20',
      };
    default:
      return {
        label: t('sync.status.idle', 'Idle'),
        description: t('sync.description.idle', 'Ready to display task output.'),
        icon: <TerminalSquare className="size-3.5" />,
        badgeClassName:
          'border-zinc-500/20 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
        panelClassName: 'ring-1 ring-zinc-500/10',
      };
  }
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
  const [status, setStatus] = useState<ConsoleStatus>('idle');
  const [isMaximized, setIsMaximized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !syncTarget) return;
    let active = true;
    let terminal = false;
    let es: EventSource | null = null;

    setLines([]);
    setRunning(true);
    setStatus('running');

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
        setStatus('error');
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
          setLines((prev) => appendOutputLines(prev, time, t('sync.success', 'Sync complete'), 'success'));
          setStatus('success');
        } else {
          const text = payload.text ?? payload.message ?? '';
          const lineType = eventType === 'log' ? undefined : 'error';
          setLines((prev) => appendOutputLines(prev, time, text, lineType));
          if (eventType === 'error') {
            setStatus('error');
          }
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
        setStatus('error');
        es?.close();
      };
    })();

    return () => {
      active = false;
      es?.close();
      setStatus('idle');
    };
  }, [open, syncTarget, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [lines]);

  useEffect(() => {
    if (!open) {
      setIsMaximized(false);
    }
  }, [open]);

  const presentation = statusPresentation(t, status);
  const maximizeLabel = t(isMaximized ? 'sync.restore' : 'sync.maximize', isMaximized ? 'Restore' : 'Maximize');
  const targetRows = syncTarget
    ? [
        { label: t('sync.target.base', 'Base'), value: syncTarget.base },
        { label: t('sync.target.category', 'Category'), value: syncTarget.category },
        { label: t('sync.target.item', 'Item'), value: syncTarget.item },
      ]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-3xl min-w-0 flex-col gap-0 overflow-hidden rounded-lg border-border/40 bg-background/95 p-0 shadow-2xl backdrop-blur-md sm:rounded-xl md:h-auto md:max-h-[calc(100svh-2rem)] md:w-[calc(100vw-2rem)]',
          isMaximized &&
            'h-[100svh] w-screen max-w-none rounded-none border-0 sm:rounded-none md:h-[100svh] md:max-h-none md:w-screen md:max-w-none',
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={maximizeLabel}
          title={maximizeLabel}
          onClick={() => setIsMaximized((prev) => !prev)}
          className="absolute top-2 right-2 z-10 size-7 rounded-md text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 focus-visible:ring-zinc-500/50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:top-3 sm:right-3"
        >
          {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </Button>

        <DialogHeader className="min-w-0 shrink-0 gap-0 border-b border-border/40 bg-linear-to-br from-zinc-50/80 via-background to-zinc-100/50 px-4 py-3 pr-12 text-left dark:from-zinc-950/80 dark:via-background dark:to-zinc-900/50 sm:px-6 sm:py-4 sm:pr-14">
          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 sm:text-[11px] sm:tracking-[0.24em]">
                <TerminalSquare className="size-3.5" />
                <span>{t('sync.consoleLabel', 'Task Console')}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-xl">
                  {t('sync.title')}
                </DialogTitle>
                <p className="min-w-0 text-xs leading-5 text-muted-foreground sm:flex-1 sm:text-sm">
                  {presentation.description}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'flex max-w-full shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm',
                presentation.badgeClassName,
              )}
            >
              {presentation.icon}
              <span className="truncate">{presentation.label}</span>
            </Badge>
          </div>

          {targetRows.length > 0 && (
            <div className="mt-3 grid min-w-0 gap-1.5 sm:mt-4 sm:grid-cols-3 sm:gap-2">
              {targetRows.map((row) => (
                <div
                  key={row.label}
                  className="min-w-0 rounded-lg border border-border/40 bg-card/60 px-2.5 py-2 shadow-sm backdrop-blur-sm sm:rounded-xl sm:px-3 sm:py-2.5"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500 sm:tracking-[0.22em]">
                    {row.label}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-xs font-medium text-zinc-800 dark:text-zinc-100 sm:text-sm">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <div
          className={cn(
            'flex min-h-0 min-w-0 flex-1 px-3 py-3 md:block md:flex-none md:px-6 md:py-4.5',
            isMaximized && 'md:flex md:flex-1',
          )}
        >
          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:rounded-xl md:block md:flex-none',
              isMaximized && 'md:flex md:flex-1 md:flex-col',
              presentation.panelClassName,
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-3 py-2 sm:px-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-red-400/80" />
                <span className="size-2 rounded-full bg-amber-400/80" />
                <span className="size-2 rounded-full bg-emerald-400/80" />
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500 sm:text-[10px] sm:tracking-[0.24em]">
                {t('sync.consoleLabel', 'Task Console')}
              </div>
            </div>

            <ScrollArea
              showHorizontalScrollbar
              className={cn(
                'min-h-0 min-w-0 max-w-full flex-1 font-mono text-[11px] sm:text-xs md:h-[24rem] md:flex-none',
                isMaximized && 'md:h-auto md:flex-1',
              )}
            >
              <div className="w-max min-w-full space-y-0.5 px-2.5 pt-2.5 pb-4 sm:px-4 sm:pt-3">
                {lines.map((line, i) => (
                  <div
                    key={`${line.time}-${i}`}
                    className={cn(
                      'grid min-w-full grid-cols-[56px_max-content] gap-1.5 rounded-md px-1.5 py-px sm:grid-cols-[68px_max-content] sm:gap-2 sm:px-2',
                      i % 2 === 0 ? 'bg-white/[0.015]' : 'bg-transparent',
                    )}
                  >
                    <div className="pt-0.5 text-[9px] font-medium tracking-wide text-zinc-500 sm:text-[10px]">
                      {line.time}
                    </div>
                    <div
                      className={cn(
                        'whitespace-pre leading-4 text-zinc-200',
                        line.type === 'success' && 'text-emerald-300',
                        line.type === 'error' && 'text-red-300',
                      )}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}

                {running && (
                  <div className="grid min-w-full grid-cols-[56px_max-content] gap-1.5 rounded-md bg-white/[0.015] px-1.5 py-px sm:grid-cols-[68px_max-content] sm:gap-2 sm:px-2">
                    <div className="pt-0.5 text-[9px] font-medium tracking-wide text-zinc-500 sm:text-[10px]">
                      {new Date().toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-2 whitespace-pre text-zinc-400">
                      <LoaderCircle className="size-3.5 animate-spin" />
                      <span>{t('sync.inProgress')}</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-border/40 bg-zinc-50/60 px-4 py-3 dark:bg-zinc-950/20 md:px-6 md:py-3.5">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-lg border-border/60 bg-background/80 px-4 text-xs font-medium shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 md:w-auto"
          >
            {t('common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
