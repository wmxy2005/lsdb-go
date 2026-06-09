import { authHeaders } from '@/api/client';
import { speedTestUrl } from '@/api/cmd';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Zap, Square, Activity, ArrowDownCircle, ArrowUpCircle, Loader2, Gauge } from 'lucide-react';

const MB = 1024 * 1024;
const CONCURRENCY = 6;
const ROUNDS = 3;
const SIZE_VALUES = [
  { key: 'quick' as const, value: 16 * MB },
  { key: 'standard' as const, value: 64 * MB },
  { key: 'deep' as const, value: 128 * MB },
];

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function bytesToMbps(bytes: number, ms: number) {
  return ms <= 0 ? 0 : (bytes * 8) / (ms / 1000) / 1_000_000;
}

export default function SpeedTestPage() {
  const { t } = useTranslation();
  const [bytes, setBytes] = useState(64 * MB);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ping: number; download: number; upload: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runTest = async () => {
    setRunning(true);
    setProgress(0);
    setResult(null);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      const pings: number[] = [];
      for (let i = 0; i < ROUNDS; i++) {
        const t0 = performance.now();
        await fetch(speedTestUrl('ping'), { headers: authHeaders(), credentials: 'include', cache: 'no-store', signal });
        pings.push(performance.now() - t0);
        setProgress(((i + 1) / (ROUNDS * 3)) * 100);
      }

      const downloads: number[] = [];
      for (let i = 0; i < ROUNDS; i++) {
        const t0 = performance.now();
        let total = 0;
        await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
          const res = await fetch(speedTestUrl('download', bytes), { headers: authHeaders(), credentials: 'include', cache: 'no-store', signal });
          const reader = res.body?.getReader();
          if (!reader) return;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
          }
        }));
        downloads.push(bytesToMbps(total, performance.now() - t0));
        setProgress(((ROUNDS + i + 1) / (ROUNDS * 3)) * 100);
      }

      const uploads: number[] = [];
      const blob = new Blob([new Uint8Array(4 * MB)]);
      for (let i = 0; i < ROUNDS; i++) {
        const t0 = performance.now();
        let total = 0;
        await Promise.all(Array.from({ length: CONCURRENCY }, () => new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', speedTestUrl('upload', bytes));
          const headers = authHeaders();
          Object.keys(headers).forEach((k) => xhr.setRequestHeader(k, headers[k]));
          xhr.withCredentials = true;
          xhr.onload = () => { total += bytes; resolve(); };
          xhr.onerror = () => reject(new Error('upload failed'));
          signal.addEventListener('abort', () => xhr.abort());
          xhr.send(blob);
        })));
        uploads.push(bytesToMbps(total, performance.now() - t0));
        setProgress(((ROUNDS * 2 + i + 1) / (ROUNDS * 3)) * 100);
      }

      setResult({ ping: median(pings), download: median(downloads), upload: median(uploads) });
      setProgress(100);
      toast.success(t('toast.speedTestComplete'));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        toast.error(t('toast.speedTestFailed'));
      }
    } finally {
      setRunning(false);
    }
  };

  const stopTest = () => {
    abortRef.current?.abort();
    setRunning(false);
    toast.info(t('toast.speedTestAborted'));
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title={t('speedTest.pageTitle')} description={t('speedTest.pageDescription')} />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Configuration Card */}
        <Card className="md:col-span-1 border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl overflow-hidden h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Gauge className="size-4 text-indigo-500" />
              <span>{t('speedTest.config.section')}</span>
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight mt-1">{t('speedTest.config.title')}</CardTitle>
            <CardDescription>{t('speedTest.config.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{t('speedTest.config.dataSize')}</label>
              <Select value={String(bytes)} onValueChange={(v) => setBytes(Number(v))} disabled={running}>
                <SelectTrigger className="w-full h-10 bg-background/50 border-border/60 rounded-lg text-xs font-medium focus:ring-primary shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-border/40">
                  {SIZE_VALUES.map((s) => (
                    <SelectItem key={s.value} value={String(s.value)} className="text-xs rounded-md">
                      {t(`speedTest.size.${s.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1">
              {running ? (
                <Button
                  variant="outline"
                  onClick={stopTest}
                  className="h-10 rounded-lg text-xs font-semibold px-4 flex items-center gap-2 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                >
                  <Square className="size-3.5 fill-current" />
                  {t('speedTest.stop')}
                </Button>
              ) : (
                <Button
                  onClick={runTest}
                  className="h-10 rounded-lg text-xs font-semibold px-4 flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-sm shadow-primary/10"
                >
                  <Zap className="size-3.5 fill-current" />
                  {t('speedTest.start')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Progress & Results Card */}
        <Card className="md:col-span-2 border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Activity className="size-4 text-emerald-500" />
              <span>{t('speedTest.progress.section')}</span>
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight mt-1">{t('speedTest.progress.title')}</CardTitle>
            <CardDescription>
              {running ? t('speedTest.progress.running') : result ? t('speedTest.progress.completed') : t('speedTest.progress.idle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress bar */}
            {running && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex justify-between text-xs font-medium text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="size-3.5 animate-spin text-indigo-500" />
                    {t('speedTest.progress.testing')}
                  </span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden" />
              </div>
            )}

            {/* Results Grid */}
            {result ? (
              <div className="grid gap-4 sm:grid-cols-3 animate-fade-in-up">
                {/* Ping Card */}
                <Card className="border-border/40 bg-background/60 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400">
                      <Activity className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('speedTest.result.ping')}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{result.ping.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{t('speedTest.unit.ms')}</span></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Download Card */}
                <Card className="border-border/40 bg-background/60 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400">
                      <ArrowDownCircle className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('speedTest.result.download')}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{result.download.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{t('speedTest.unit.mbps')}</span></p>
                    </div>
                  </CardContent>
                </Card>

                {/* Upload Card */}
                <Card className="border-border/40 bg-background/60 shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400">
                      <ArrowUpCircle className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('speedTest.result.upload')}</p>
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">{result.upload.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">{t('speedTest.unit.mbps')}</span></p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              !running && (
                <div className="flex flex-col items-center justify-center text-center py-12 border border-dashed border-border/60 rounded-xl bg-zinc-50/20 dark:bg-zinc-900/10">
                  <Gauge className="size-8 text-zinc-300 dark:text-zinc-700 mb-2" />
                  <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">{t('speedTest.idleHint')}</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
