import { getPcStatsStreamUrl, shutdown } from '@/api/cmd';
import { MonitorChart } from '@/components/MonitorChart';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Power, RotateCcw, Activity, Cpu, Network, Loader2 } from 'lucide-react';

type StreamSample = { time?: string; cpu?: number; uploadSpeed?: number; downloadSpeed?: number };

export default function ToolPage() {
  const [loading, setLoading] = useState('');
  const [showMonitor, setShowMonitor] = useState(false);
  const [cpuSample, setCpuSample] = useState<{ time: string; value: number }>();
  const [networkSample, setNetworkSample] = useState<{ time: string; value: Record<string, number> }>();

  const handleShutdown = async (restart: boolean) => {
    const key = restart ? 'restart' : 'shutdown';
    setLoading(key);
    const res = await shutdown(restart);
    if (res.success) toast.success('命令已成功发送至服务器');
    else toast.error(res.message ?? '操作失败');
    setTimeout(() => setLoading(''), 1000);
  };

  useEffect(() => {
    if (!showMonitor) return;
    const streamUrl = getPcStatsStreamUrl();
    let active = true;
    const es = new EventSource(streamUrl, { withCredentials: true });

    const onMessage = (event: MessageEvent) => {
      let data: StreamSample;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!active || !data.time) return;
      setCpuSample({ time: data.time, value: data.cpu ?? 0 });
      setNetworkSample({
        time: data.time,
        value: { uploadSpeed: data.uploadSpeed ?? 0, downloadSpeed: data.downloadSpeed ?? 0 },
      });
    };

    es.onmessage = onMessage;
    es.onerror = () => {
      if (!active) return;
      active = false;
      es.close();
      setShowMonitor(false);
      toast.error('监控流连接已断开');
    };

    return () => { active = false; es.close(); };
  }, [showMonitor]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader title="系统工具" description="远程控制、电源管理与实时系统性能监控。" />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Power Control Card */}
        <Card className="border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Power className="size-4 text-red-500" />
              <span>电源管理</span>
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight mt-1">服务器电源控制</CardTitle>
            <CardDescription>远程执行服务器关机或重启操作，请谨慎使用。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                variant="destructive"
                disabled={!!loading}
                onClick={() => handleShutdown(false)}
                className="h-10 rounded-lg text-xs font-semibold px-4 flex items-center gap-2 transition-all duration-200 shadow-sm"
              >
                {loading === 'shutdown' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    正在关机...
                  </>
                ) : (
                  <>
                    <Power className="size-3.5" />
                    安全关机
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                disabled={!!loading}
                onClick={() => handleShutdown(true)}
                className="h-10 rounded-lg text-xs font-semibold px-4 flex items-center gap-2 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
              >
                {loading === 'restart' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    正在重启...
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-3.5" />
                    系统重启
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Monitor Control Card */}
        <Card className="border-border/40 bg-card/40 shadow-sm backdrop-blur-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              <Activity className="size-4 text-indigo-500" />
              <span>实时监控</span>
            </div>
            <CardTitle className="text-lg font-semibold tracking-tight mt-1">系统性能监视器</CardTitle>
            <CardDescription>开启 SSE 实时数据流，监控 CPU 占用率与网络吞吐量。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-4 h-12 text-xs shadow-none">
              <Switch checked={showMonitor} onCheckedChange={setShowMonitor} className="scale-90" id="monitor-toggle" />
              <Label htmlFor="monitor-toggle" className="cursor-pointer font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                {showMonitor ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    正在实时监控中...
                  </>
                ) : (
                  '开启实时系统性能监控'
                )}
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Charts Grid */}
      {showMonitor && (
        <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
          <div className="rounded-xl border border-border/40 bg-card/30 p-1 shadow-sm backdrop-blur-sm overflow-hidden">
            <MonitorChart
              title="CPU 占用率"
              sample={cpuSample}
              min={0}
              max={100}
              valueFormatter={(v) => `${v.toFixed(1)}%`}
            />
          </div>
          <div className="rounded-xl border border-border/40 bg-card/30 p-1 shadow-sm backdrop-blur-sm overflow-hidden">
            <MonitorChart
              title="网络吞吐量"
              sample={networkSample}
              autoScaleY
              metrics={[
                { key: 'uploadSpeed', label: '上传速度', color: 'rgb(99, 102, 241)', fillColor: 'rgba(99, 102, 241, 0.1)' },
                { key: 'downloadSpeed', label: '下载速度', color: 'rgb(16, 185, 129)', fillColor: 'rgba(16, 185, 129, 0.1)' },
              ]}
              valueFormatter={(v) => `${v.toFixed(2)} MB/s`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
