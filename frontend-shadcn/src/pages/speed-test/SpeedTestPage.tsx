import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Gauge,
  GitBranch,
  Globe,
  Square,
  Wifi,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MB,
  PHASE_LABEL_KEY,
  ROUND_COUNT,
  TEST_SIZE_OPTIONS,
  TOTAL_PROGRESS_UNITS,
} from '@/pages/speed-test/constants';
import { measureDownload, measureLatency, measureUpload } from '@/pages/speed-test/measure';
import { MiniSparkline } from '@/pages/speed-test/MiniSparkline';
import { SpeedGauge } from '@/pages/speed-test/SpeedGauge';
import type {
  MetricKey,
  SparklineSampleBuffer,
  SparklineSeries,
  SpeedResult,
  SpeedRoundResult,
  TestPhase,
} from '@/pages/speed-test/types';
import {
  appendSparklineValue,
  calculateJitter,
  emptySparklineSampleBuffer,
  emptySparklineSeries,
  formatNumber,
  getGaugeMax,
  getServerName,
  hasSparkline,
  initialRounds,
  median,
  seedSparklineSeries,
} from '@/pages/speed-test/utils';

import './speed-test.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

const SPARKLINE_REFRESH_SAMPLE_COUNT = 10;

type LiveValuesState = {
  latencyMs?: number;
  jitterMs?: number;
  downloadMbps?: number;
  uploadMbps?: number;
};

type PendingUiUpdate = {
  live?: LiveValuesState;
  progress?: { completedUnits: number; phasePercent: number };
};

export default function SpeedTestPage() {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [activeRound, setActiveRound] = useState(0);
  const [testBytes, setTestBytes] = useState(TEST_SIZE_OPTIONS[1].value);
  const [progress, setProgress] = useState(0);
  const [displayMetric, setDisplayMetric] = useState<MetricKey>('download');
  const [liveValues, setLiveValues] = useState({
    latencyMs: undefined as number | undefined,
    jitterMs: undefined as number | undefined,
    downloadMbps: undefined as number | undefined,
    uploadMbps: undefined as number | undefined,
  });
  const [currentResult, setCurrentResult] = useState<SpeedResult>();
  const [history, setHistory] = useState<SpeedResult[]>([]);
  const [sparklineSeries, setSparklineSeries] = useState<SparklineSeries>(emptySparklineSeries);
  const abortRef = useRef<AbortController>();
  const sparklineSampleBufferRef = useRef<SparklineSampleBuffer>(emptySparklineSampleBuffer());
  const pendingUiRef = useRef<PendingUiUpdate>({});
  const uiRafRef = useRef<number>();
  const gaugePhaseKeyRef = useRef('');
  const [stableGaugeMax, setStableGaugeMax] = useState(100);

  const running = phase === 'latency' || phase === 'download' || phase === 'upload';

  const flushPendingUi = useCallback(() => {
    if (uiRafRef.current !== undefined) return;
    uiRafRef.current = requestAnimationFrame(() => {
      uiRafRef.current = undefined;
      const pending = pendingUiRef.current;
      pendingUiRef.current = {};

      if (pending.live) {
        setLiveValues((prev) => ({ ...prev, ...pending.live }));
      }
      if (pending.progress) {
        const { completedUnits, phasePercent } = pending.progress;
        setProgress(
          Math.min(
            100,
            Math.round(((completedUnits + phasePercent / 100) / TOTAL_PROGRESS_UNITS) * 100),
          ),
        );
      }
    });
  }, []);

  const scheduleLiveUpdate = useCallback(
    (patch: LiveValuesState) => {
      pendingUiRef.current.live = { ...pendingUiRef.current.live, ...patch };
      flushPendingUi();
    },
    [flushPendingUi],
  );

  const scheduleProgressUpdate = useCallback(
    (completedUnits: number, phasePercent = 0) => {
      pendingUiRef.current.progress = { completedUnits, phasePercent };
      flushPendingUi();
    },
    [flushPendingUi],
  );

  const serverName = useMemo(
    () => getServerName(t('speedTest.server.current')),
    [t, i18n.language],
  );

  const activeMetric: MetricKey = running
    ? phase === 'upload'
      ? 'upload'
      : phase === 'latency'
        ? 'ping'
        : 'download'
    : displayMetric;

  const gaugeValue =
    activeMetric === 'download'
      ? liveValues.downloadMbps ?? currentResult?.downloadMbps
      : activeMetric === 'upload'
        ? liveValues.uploadMbps ?? currentResult?.uploadMbps
        : activeMetric === 'ping'
          ? liveValues.latencyMs ?? currentResult?.latencyMs
          : liveValues.jitterMs ?? currentResult?.jitterMs;

  const gaugeUnit =
    activeMetric === 'download' || activeMetric === 'upload'
      ? t('speedTest.unit.mbps')
      : t('speedTest.unit.ms');

  const computedGaugeMax = useMemo(
    () => getGaugeMax(activeMetric, gaugeValue, history),
    [activeMetric, gaugeValue, history],
  );

  useEffect(() => {
    const phaseKey = running ? `${phase}-${activeMetric}` : `idle-${activeMetric}`;

    if (phaseKey !== gaugePhaseKeyRef.current) {
      gaugePhaseKeyRef.current = phaseKey;
      setStableGaugeMax(computedGaugeMax);
      return;
    }

    if (!running) {
      setStableGaugeMax(computedGaugeMax);
      return;
    }

    setStableGaugeMax((prev) => Math.max(prev, computedGaugeMax));
  }, [phase, activeMetric, running, computedGaugeMax]);

  const phaseText = useMemo(() => {
    const label = t(PHASE_LABEL_KEY[phase]);
    if (!running) return label;
    return t('speedTest.phase.round', {
      label,
      round: activeRound,
      total: ROUND_COUNT,
    });
  }, [activeRound, phase, running, t, i18n.language]);

  const phaseLabelPlaceholder = useMemo(
    () =>
      t('speedTest.phase.round', {
        label: t('speedTest.phase.upload'),
        round: ROUND_COUNT,
        total: ROUND_COUNT,
      }),
    [t, i18n.language],
  );

  const appendSparklineSample = (metric: MetricKey, value: number) => {
    setSparklineSeries((prevSeries) => ({
      ...prevSeries,
      [metric]: appendSparklineValue(prevSeries[metric], value),
    }));
  };

  const flushSparklineSamples = (metric: MetricKey) => {
    const buffer = sparklineSampleBufferRef.current[metric];
    if (!buffer.length) return;
    const nextValue = median(buffer);
    sparklineSampleBufferRef.current[metric] = [];
    appendSparklineSample(metric, nextValue);
  };

  const bufferSparklineSample = (metric: MetricKey, value?: number) => {
    if (value === undefined || !Number.isFinite(value)) return;

    if (metric === 'ping' || metric === 'jitter') {
      appendSparklineSample(metric, value);
      return;
    }

    const buffer = sparklineSampleBufferRef.current[metric];
    buffer.push(value);
    if (buffer.length < SPARKLINE_REFRESH_SAMPLE_COUNT) return;
    flushSparklineSamples(metric);
  };

  const metricCards = useMemo(
    () => [
      {
        key: 'download' as MetricKey,
        title: t('speedTest.metric.download'),
        value: liveValues.downloadMbps ?? currentResult?.downloadMbps,
        unit: t('speedTest.unit.mbps'),
        icon: <ArrowDown />,
        tone: 'blue',
        sparklineValues: sparklineSeries.download,
      },
      {
        key: 'upload' as MetricKey,
        title: t('speedTest.metric.upload'),
        value: liveValues.uploadMbps ?? currentResult?.uploadMbps,
        unit: t('speedTest.unit.mbps'),
        icon: <ArrowUp />,
        tone: 'purple',
        sparklineValues: sparklineSeries.upload,
      },
      {
        key: 'ping' as MetricKey,
        title: t('speedTest.metric.ping'),
        value: liveValues.latencyMs ?? currentResult?.latencyMs,
        unit: t('speedTest.unit.ms'),
        icon: <Gauge />,
        tone: 'cyan',
        sparklineValues: sparklineSeries.ping,
      },
      {
        key: 'jitter' as MetricKey,
        title: t('speedTest.metric.jitter'),
        value: liveValues.jitterMs ?? currentResult?.jitterMs,
        unit: t('speedTest.unit.ms'),
        icon: <GitBranch />,
        tone: 'orange',
        sparklineValues: sparklineSeries.jitter,
      },
    ],
    [currentResult, liveValues, sparklineSeries, t, i18n.language],
  );

  const chartData = useMemo(
    () => ({
      labels: history.slice().reverse().map((item) => item.time),
      datasets: [
        {
          label: t('speedTest.metric.download'),
          data: history.slice().reverse().map((item) => item.downloadMbps),
          borderColor: '#1677ff',
          backgroundColor: 'rgba(22, 119, 255, 0.12)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
        },
        {
          label: t('speedTest.metric.upload'),
          data: history.slice().reverse().map((item) => item.uploadMbps),
          borderColor: '#8a2be2',
          backgroundColor: 'rgba(138, 43, 226, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    }),
    [history, t, i18n.language],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: t('speedTest.unit.mbps') },
          grid: { color: 'rgba(15, 23, 42, 0.08)' },
        },
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 6 },
        },
      },
      plugins: {
        legend: {
          align: 'end' as const,
          labels: { boxWidth: 22, usePointStyle: true },
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'line'>) =>
              t('speedTest.chart.tooltip', {
                label: context.dataset.label,
                value: formatNumber(context.parsed.y ?? undefined),
                unit: t('speedTest.unit.mbps'),
              }),
          },
        },
      },
    }),
    [t, i18n.language],
  );

  const updateRound = (
    rounds: SpeedRoundResult[],
    roundIndex: number,
    values: Partial<SpeedRoundResult>,
  ) => {
    rounds[roundIndex] = { ...rounds[roundIndex], ...values };
  };

  const setOverallProgress = (completedUnits: number, phasePercent = 0) => {
    setProgress(
      Math.min(
        100,
        Math.round(((completedUnits + phasePercent / 100) / TOTAL_PROGRESS_UNITS) * 100),
      ),
    );
  };

  const stopTest = () => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    if (uiRafRef.current !== undefined) {
      cancelAnimationFrame(uiRafRef.current);
      uiRafRef.current = undefined;
    }
    pendingUiRef.current = {};
    setPhase('idle');
    setActiveRound(0);
    setProgress(0);
    toast.info(t('toast.speedTestAborted'));
  };

  const startTest = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    const nextRounds = initialRounds();
    abortRef.current = controller;
    setCurrentResult(undefined);
    setProgress(0);
    setDisplayMetric('ping');
    setLiveValues({
      latencyMs: undefined,
      jitterMs: undefined,
      downloadMbps: undefined,
      uploadMbps: undefined,
    });
    sparklineSampleBufferRef.current = emptySparklineSampleBuffer();

    let completedUnits = 0;
    const latencySamples: number[] = [];
    const downloadSamples: number[] = [];
    const uploadSamples: number[] = [];

    try {
      setPhase('latency');
      for (let index = 0; index < ROUND_COUNT; index += 1) {
        setActiveRound(index + 1);
        setOverallProgress(completedUnits, 15);
        const latencyMs = await measureLatency(controller.signal);
        latencySamples.push(latencyMs);
        const jitterMs = calculateJitter(latencySamples);
        setLiveValues((prev) => ({ ...prev, latencyMs, jitterMs }));
        bufferSparklineSample('ping', latencyMs);
        bufferSparklineSample('jitter', jitterMs);
        updateRound(nextRounds, index, { latencyMs });
        completedUnits += 1;
        setOverallProgress(completedUnits);
      }

      setDisplayMetric('download');
      setPhase('download');
      for (let index = 0; index < ROUND_COUNT; index += 1) {
        setActiveRound(index + 1);
        const downloadMbps = await measureDownload(testBytes, controller.signal, (percent, currentMbps) => {
          scheduleProgressUpdate(completedUnits, percent);
          if (currentMbps !== undefined) {
            scheduleLiveUpdate({ downloadMbps: currentMbps });
            bufferSparklineSample('download', currentMbps);
          }
        });
        flushSparklineSamples('download');
        downloadSamples.push(downloadMbps);
        setLiveValues((prev) => ({ ...prev, downloadMbps }));
        updateRound(nextRounds, index, { downloadMbps });
        completedUnits += 1;
        setOverallProgress(completedUnits);
      }

      setDisplayMetric('upload');
      setPhase('upload');
      for (let index = 0; index < ROUND_COUNT; index += 1) {
        setActiveRound(index + 1);
        const uploadMbps = await measureUpload(testBytes, controller.signal, (percent, currentMbps) => {
          scheduleProgressUpdate(completedUnits, percent);
          if (currentMbps !== undefined) {
            scheduleLiveUpdate({ uploadMbps: currentMbps });
            bufferSparklineSample('upload', currentMbps);
          }
        });
        flushSparklineSamples('upload');
        uploadSamples.push(uploadMbps);
        setLiveValues((prev) => ({ ...prev, uploadMbps }));
        updateRound(nextRounds, index, { uploadMbps });
        completedUnits += 1;
        setOverallProgress(completedUnits);
      }

      const result: SpeedResult = {
        key: String(Date.now()),
        time: new Date().toLocaleTimeString(),
        latencyMs: median(latencySamples),
        jitterMs: calculateJitter(latencySamples),
        downloadMbps: median(downloadSamples),
        uploadMbps: median(uploadSamples),
        bytes: testBytes,
        rounds: nextRounds,
      };

      setCurrentResult(result);
      setLiveValues({
        latencyMs: result.latencyMs,
        jitterMs: result.jitterMs,
        downloadMbps: result.downloadMbps,
        uploadMbps: result.uploadMbps,
      });

      const nextHistory = [result, ...history].slice(0, 10);
      if (history.length === 0) {
        setSparklineSeries(seedSparklineSeries(nextHistory));
      } else {
        setSparklineSeries((prevSeries) => ({
          download: appendSparklineValue(prevSeries.download, result.downloadMbps),
          upload: appendSparklineValue(prevSeries.upload, result.uploadMbps),
          ping: appendSparklineValue(prevSeries.ping, result.latencyMs),
          jitter: appendSparklineValue(prevSeries.jitter, result.jitterMs),
        }));
      }
      setHistory(nextHistory);
      sparklineSampleBufferRef.current = emptySparklineSampleBuffer();
      setPhase('done');
      setActiveRound(0);
      setProgress(100);
      setDisplayMetric('download');
      toast.success(t('toast.speedTestComplete'));
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error(err);
      setPhase('error');
      toast.error((err as Error)?.message || t('speedTest.error.failed'));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = undefined;
      }
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (uiRafRef.current !== undefined) {
        cancelAnimationFrame(uiRafRef.current);
      }
    };
  }, []);

  const activeMetricCard = metricCards.find((item) => item.key === activeMetric);

  return (
    <div className="speed-page">
      <section className="speed-hero">
        <div className="speed-hero-copy">
          <h1 className="speed-hero-title">
            {t('speedTest.hero.titleLine1')}
            <br />
            {t('speedTest.hero.titleLine2')}
          </h1>
          <p className="speed-hero-description">{t('speedTest.hero.description')}</p>
          <button
            type="button"
            className={`speed-start-btn ${running ? 'speed-stop-btn' : ''}`}
            onClick={running ? stopTest : startTest}
          >
            {running ? (
              <>
                <Square className="size-4 fill-current" />
                {t('speedTest.action.stop')}
              </>
            ) : (
              <>
                <Gauge className="size-4" />
                {t('speedTest.action.start')}
              </>
            )}
          </button>
          <div className="speed-hero-controls">
            <Zap className="speed-controls-icon size-4" />
            <span>{t('speedTest.testSize')}</span>
            <Select
              value={String(testBytes)}
              onValueChange={(v) => setTestBytes(Number(v))}
              disabled={running}
            >
              <SelectTrigger className="speed-size-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {t(`speedTest.size.${opt.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="speed-gauge-wrap">
          <SpeedGauge
            title={activeMetricCard?.title ?? t('speedTest.metric.download')}
            value={gaugeValue}
            unit={gaugeUnit}
            max={stableGaugeMax}
            tone={activeMetricCard?.tone ?? 'blue'}
            sparklineValues={activeMetricCard?.sparklineValues ?? []}
          />
          <div className="speed-phase">
            <span className="speed-phase-label">
              <span className="speed-phase-label-placeholder" aria-hidden="true">
                {phaseLabelPlaceholder}
              </span>
              <span className="speed-phase-label-current">{phaseText}</span>
            </span>
            <Progress
              value={progress}
              className={`speed-phase-progress ${phase === 'error' ? '[&>div]:bg-destructive' : ''}`}
            />
          </div>
        </div>

        <div className="speed-side-metrics">
          {metricCards.map((metric) => (
            <button
              key={metric.key}
              className={`speed-metric-card ${
                hasSparkline(metric.sparklineValues) ? 'speed-metric-card-with-chart' : ''
              } speed-${metric.tone}`}
              type="button"
              onClick={() => {
                if (!running) setDisplayMetric(metric.key);
              }}
            >
              <span className="speed-metric-icon">{metric.icon}</span>
              <span className="speed-metric-body">
                <span>{metric.title}</span>
                <strong>
                  {formatNumber(
                    metric.value,
                    metric.key === 'ping' || metric.key === 'jitter' ? 1 : 2,
                  )}
                  <small>{metric.unit}</small>
                </strong>
              </span>
              <MiniSparkline values={metric.sparklineValues} tone={metric.tone} />
            </button>
          ))}
        </div>
      </section>

      <Card className="speed-summary-card">
        <CardContent className="p-0">
          <div className="speed-summary-grid">
            {metricCards.map((metric) => (
              <div key={metric.key} className={`speed-summary-item speed-${metric.tone}`}>
                <span className="speed-summary-icon">{metric.icon}</span>
                <span>
                  <small>{metric.title}</small>
                  <strong>
                    {formatNumber(
                      metric.value,
                      metric.key === 'ping' || metric.key === 'jitter' ? 1 : 2,
                    )}{' '}
                    <em>{metric.unit}</em>
                  </strong>
                  <small>
                    {metric.key === 'ping' || metric.key === 'jitter'
                      ? t('speedTest.hint.lowerIsBetter')
                      : t('speedTest.hint.sample', {
                          size: Math.round(testBytes / MB),
                          unit: t('speedTest.unit.mb'),
                        })}
                  </small>
                </span>
              </div>
            ))}
            <div className="speed-summary-item speed-server">
              <span className="speed-summary-icon">
                <Globe />
              </span>
              <span>
                <small>{t('speedTest.server.label')}</small>
                <strong>{serverName}</strong>
                <small>{t('speedTest.server.current')}</small>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="speed-bottom-grid">
        <Card className="speed-panel speed-results-card">
          <CardHeader className="pb-3">
            <CardTitle className="speed-panel-title">{t('speedTest.recent.title')}</CardTitle>
          </CardHeader>
          <CardContent className="speed-results-body pt-0">
            <div className="speed-recent-list">
              {history.length ? (
                history.slice(0, 5).map((item) => (
                  <div className="speed-recent-row" key={item.key}>
                    <Wifi className="speed-result-wifi size-[18px]" />
                    <span className="speed-recent-time">{item.time}</span>
                    <span className="speed-recent-metric speed-blue">
                      <ArrowDown className="size-3.5" />
                      <strong>{formatNumber(item.downloadMbps)}</strong>
                      <small>{t('speedTest.unit.mbps')}</small>
                    </span>
                    <span className="speed-recent-metric speed-purple">
                      <ArrowUp className="size-3.5" />
                      <strong>{formatNumber(item.uploadMbps)}</strong>
                      <small>{t('speedTest.unit.mbps')}</small>
                    </span>
                    <span className="speed-recent-metric speed-cyan">
                      <Gauge className="size-3.5" />
                      <strong>{formatNumber(item.latencyMs, 1)}</strong>
                      <small>{t('speedTest.unit.ms')}</small>
                    </span>
                    <span className="speed-recent-metric speed-orange">
                      <GitBranch className="size-3.5" />
                      <strong>{formatNumber(item.jitterMs, 1)}</strong>
                      <small>{t('speedTest.unit.ms')}</small>
                    </span>
                    <ChevronRight className="speed-recent-arrow size-3.5" />
                  </div>
                ))
              ) : (
                <div className="speed-recent-empty">{t('speedTest.recent.empty')}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="speed-panel speed-results-card">
          <CardHeader className="pb-3">
            <CardTitle className="speed-panel-title">
              {t('speedTest.chart.title', { unit: t('speedTest.unit.mbps') })}
            </CardTitle>
          </CardHeader>
          <CardContent className="speed-results-body pt-0">
            <div className="speed-chart">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
