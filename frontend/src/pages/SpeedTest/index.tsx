import { authHeaders, speedTestUrl } from '@/services/lsdb/LsdbController';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DashboardOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  RightOutlined,
  StopOutlined,
  ThunderboltOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import './index.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
);

type TestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'done' | 'error';

type SpeedRoundResult = {
  key: string;
  round: number;
  latencyMs?: number;
  downloadMbps?: number;
  uploadMbps?: number;
};

type SpeedResult = {
  key: string;
  time: string;
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  bytes: number;
  rounds: SpeedRoundResult[];
};

type MetricKey = 'download' | 'upload' | 'ping' | 'jitter';
type SparklineValue = number | null;
type SparklineSeries = Record<MetricKey, SparklineValue[]>;
type SparklineSampleBuffer = Record<MetricKey, number[]>;

const ROUND_COUNT = 3;
const PHASE_COUNT = 3;
const TOTAL_PROGRESS_UNITS = ROUND_COUNT * PHASE_COUNT;
const SPARKLINE_POINT_COUNT = 16;
const SPARKLINE_REFRESH_SAMPLE_COUNT = 10;
const MB = 1024 * 1024;
const UPLOAD_CHUNK_BYTES = 4 * MB;
const SPEED_TEST_CONCURRENCY = 6;

const TEST_SIZE_OPTIONS = [
  { label: '16 MB', value: 16 * MB },
  { label: '64 MB', value: 64 * MB },
  { label: '128 MB', value: 128 * MB },
  { label: '256 MB', value: 256 * MB },
  { label: '512 MB', value: 512 * MB },
];

const PHASE_LABEL_ID: Record<TestPhase, string> = {
  idle: 'speedTest.phase.ready',
  latency: 'speedTest.phase.latency',
  download: 'speedTest.phase.download',
  upload: 'speedTest.phase.upload',
  done: 'speedTest.phase.done',
  error: 'speedTest.phase.error',
};

function formatNumber(value?: number, fractionDigits = 2) {
  if (value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

function bytesToMbps(bytes: number, durationMs: number) {
  if (durationMs <= 0) {
    return 0;
  }

  return (bytes * 8) / (durationMs / 1000) / 1_000_000;
}

function median(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

function calculateJitter(values: number[]) {
  if (values.length < 2) {
    return 0;
  }

  const deltas = values.slice(1).map((value, index) => {
    return Math.abs(value - values[index]);
  });

  return median(deltas);
}

function createUploadBlob(bytes: number) {
  const chunks: Uint8Array[] = [];
  let remaining = bytes;

  while (remaining > 0) {
    const chunkBytes = Math.min(remaining, UPLOAD_CHUNK_BYTES);
    chunks.push(new Uint8Array(chunkBytes));
    remaining -= chunkBytes;
  }

  return new Blob(chunks);
}

async function checkedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response;
}

async function measureLatency(signal: AbortSignal) {
  const start = performance.now();
  await checkedFetch(speedTestUrl('ping'), {
    headers: authHeaders(),
    credentials: 'include',
    cache: 'no-store',
    signal,
  });

  return performance.now() - start;
}

async function measureDownload(
  bytes: number,
  signal: AbortSignal,
  onProgress: (percent: number, currentMbps?: number) => void,
) {
  const start = performance.now();
  const targetBytes = bytes * SPEED_TEST_CONCURRENCY;
  const loadedByRequest = new Array(SPEED_TEST_CONCURRENCY).fill(0);
  let totalLoaded = 0;

  const reportProgress = (requestIndex: number, loaded: number) => {
    const nextLoaded = Math.max(loadedByRequest[requestIndex], loaded);
    totalLoaded += nextLoaded - loadedByRequest[requestIndex];
    loadedByRequest[requestIndex] = nextLoaded;
    const durationMs = Math.max(1, performance.now() - start);
    onProgress(
      Math.min(100, Math.round((totalLoaded / targetBytes) * 100)),
      bytesToMbps(totalLoaded, durationMs),
    );
  };

  onProgress(0, 0);
  await Promise.all(
    Array.from({ length: SPEED_TEST_CONCURRENCY }, async (_, requestIndex) => {
      const response = await checkedFetch(speedTestUrl('download', bytes), {
        headers: authHeaders(),
        credentials: 'include',
        cache: 'no-store',
        signal,
      });

      if (!response.body) {
        const blob = await response.blob();
        reportProgress(requestIndex, blob.size);
        return;
      }

      const reader = response.body.getReader();
      let requestLoaded = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        requestLoaded += value?.byteLength ?? 0;
        reportProgress(requestIndex, requestLoaded);
      }
    }),
  );

  const durationMs = performance.now() - start;
  const downloadMbps = bytesToMbps(totalLoaded, durationMs);
  onProgress(100, downloadMbps);
  return downloadMbps;
}

async function measureUpload(
  bytes: number,
  signal: AbortSignal,
  onProgress: (percent: number, currentMbps?: number) => void,
) {
  const payload = createUploadBlob(bytes);
  const start = performance.now();
  const targetBytes = bytes * SPEED_TEST_CONCURRENCY;
  const loadedByRequest = new Array(SPEED_TEST_CONCURRENCY).fill(0);
  let totalLoaded = 0;

  const reportProgress = (requestIndex: number, loaded: number) => {
    const nextLoaded = Math.max(loadedByRequest[requestIndex], loaded);
    totalLoaded += nextLoaded - loadedByRequest[requestIndex];
    loadedByRequest[requestIndex] = nextLoaded;
    onProgress(
      Math.min(100, Math.round((totalLoaded / targetBytes) * 100)),
      bytesToMbps(totalLoaded, Math.max(1, performance.now() - start)),
    );
  };

  const uploadOne = (requestIndex: number) =>
    new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const progressTimer = window.setInterval(() => {
      if (settled) {
        return;
      }

      const estimatedLoaded = Math.min(
        bytes * 0.95,
        loadedByRequest[requestIndex] + bytes / 120,
      );
      if (estimatedLoaded > loadedByRequest[requestIndex]) {
        reportProgress(requestIndex, estimatedLoaded);
      }
    }, 250);

    const cleanupUpload = () => {
      window.clearInterval(progressTimer);
      signal.removeEventListener('abort', abortUpload);
    };

    const abortUpload = () => {
      settled = true;
      cleanupUpload();
      xhr.abort();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    if (signal.aborted) {
      abortUpload();
      return;
    }

    signal.addEventListener('abort', abortUpload, { once: true });

    xhr.open('POST', speedTestUrl('upload', bytes));
    xhr.withCredentials = true;
    Object.entries(authHeaders()).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      const loaded = event.loaded || 0;
      reportProgress(requestIndex, loaded);
    };

    xhr.onload = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupUpload();
      if (xhr.status >= 200 && xhr.status < 300) {
        reportProgress(requestIndex, bytes);
        resolve();
        return;
      }
      reject(new Error(`HTTP ${xhr.status}`));
    };

    xhr.onerror = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupUpload();
      reject(new Error('Upload failed'));
    };

    xhr.onabort = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanupUpload();
      reject(new DOMException('Upload aborted', 'AbortError'));
    };

    reportProgress(requestIndex, 0);
    xhr.send(payload);
  });

  onProgress(0, 0);
  await Promise.all(
    Array.from({ length: SPEED_TEST_CONCURRENCY }, (_, requestIndex) =>
      uploadOne(requestIndex),
    ),
  );

  const uploadMbps = bytesToMbps(totalLoaded, performance.now() - start);
  onProgress(100, uploadMbps);
  return uploadMbps;
}

function initialRounds(): SpeedRoundResult[] {
  return Array.from({ length: ROUND_COUNT }, (_, index) => ({
    key: String(index + 1),
    round: index + 1,
  }));
}

function getServerName(fallback: string) {
  try {
    const url = new URL(speedTestUrl('ping'), window.location.origin);
    return url.host || url.origin;
  } catch {
    return fallback;
  }
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
) {
  const angleRadians = (angleDegrees * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY - radius * Math.sin(angleRadians),
  };
}

function describeArc(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? '0' : '1';
  const sweepFlag = endAngle > startAngle ? '0' : '1';

  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    sweepFlag,
    end.x,
    end.y,
  ].join(' ');
}

function getGaugeMax(
  metric: MetricKey,
  value: number | undefined,
  history: SpeedResult[],
) {
  const historicalMax = history.reduce((maxValue, item) => {
    const nextValue =
      metric === 'download'
        ? item.downloadMbps
        : metric === 'upload'
        ? item.uploadMbps
        : metric === 'ping'
        ? item.latencyMs
        : item.jitterMs;

    return Math.max(maxValue, nextValue);
  }, 0);
  const target = Math.max(value ?? 0, historicalMax);
  const steps =
    metric === 'download' || metric === 'upload'
      ? [100, 500, 1000, 2500, 5000, 10000, 25000]
      : [100, 200, 500, 1000, 2000];

  return steps.find((step) => target <= step * 0.9) ?? steps[steps.length - 1];
}

function formatGaugeTick(value: number) {
  if (value >= 1000) {
    return `${value / 1000}k`;
  }

  return String(value);
}

function metricValueFromResult(result: SpeedResult, metric: MetricKey) {
  switch (metric) {
    case 'download':
      return result.downloadMbps;
    case 'upload':
      return result.uploadMbps;
    case 'ping':
      return result.latencyMs;
    case 'jitter':
      return result.jitterMs;
    default:
      return 0;
  }
}

function emptySparklineSeries(): SparklineSeries {
  return {
    download: [],
    upload: [],
    ping: [],
    jitter: [],
  };
}

function emptySparklineSampleBuffer(): SparklineSampleBuffer {
  return {
    download: [],
    upload: [],
    ping: [],
    jitter: [],
  };
}

function appendSparklineValue(
  values: SparklineValue[],
  value: number,
): SparklineValue[] {
  if (!Number.isFinite(value)) {
    return values;
  }

  const nextValues = [...values, value];
  return nextValues.slice(Math.max(0, nextValues.length - SPARKLINE_POINT_COUNT));
}

function seedSparklineSeries(history: SpeedResult[]): SparklineSeries {
  const baseSeries = emptySparklineSeries();
  const chronologicalHistory = history.slice(0, SPARKLINE_POINT_COUNT).reverse();

  if (chronologicalHistory.length === 1) {
    const [firstResult] = chronologicalHistory;
    const latencyValues: number[] = [];

    firstResult.rounds.forEach((round) => {
      if (
        round.downloadMbps !== undefined &&
        Number.isFinite(round.downloadMbps)
      ) {
        baseSeries.download = appendSparklineValue(
          baseSeries.download,
          round.downloadMbps,
        );
      }
      if (round.uploadMbps !== undefined && Number.isFinite(round.uploadMbps)) {
        baseSeries.upload = appendSparklineValue(
          baseSeries.upload,
          round.uploadMbps,
        );
      }
      if (round.latencyMs !== undefined && Number.isFinite(round.latencyMs)) {
        latencyValues.push(round.latencyMs);
        baseSeries.ping = appendSparklineValue(
          baseSeries.ping,
          round.latencyMs,
        );
        baseSeries.jitter = appendSparklineValue(
          baseSeries.jitter,
          calculateJitter(latencyValues),
        );
      }
    });

    return baseSeries;
  }

  chronologicalHistory.forEach((result) => {
    (['download', 'upload', 'ping', 'jitter'] as MetricKey[]).forEach(
      (metric) => {
        baseSeries[metric] = appendSparklineValue(
          baseSeries[metric],
          metricValueFromResult(result, metric),
        );
      },
    );
  });

  return baseSeries;
}

function hasSparkline(values: SparklineValue[]) {
  return (
    values.filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    ).length >= 2
  );
}

function getSparklinePoints(
  values: SparklineValue[],
  width: number,
  height: number,
) {
  const paddedValues = [
    ...new Array<SparklineValue>(
      Math.max(0, SPARKLINE_POINT_COUNT - values.length),
    ).fill(null),
    ...values.slice(-SPARKLINE_POINT_COUNT),
  ];
  const finiteValues = paddedValues.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  );
  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  const range = maxValue - minValue || 1;
  const horizontalStep = width / (SPARKLINE_POINT_COUNT - 1);

  return paddedValues
    .map((value, index) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
      }

      const x = index * horizontalStep;
      const y =
        height - ((value - minValue) / range) * (height * 0.72) - height * 0.14;
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));
}

function smoothSparklinePath(
  values: SparklineValue[],
  width: number,
  height: number,
) {
  if (!hasSparkline(values)) {
    return '';
  }

  const points = getSparklinePoints(values, width, height);
  const [firstPoint] = points;
  const path = [`M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] ?? current;
    const afterNext = points[index + 2] ?? next;
    const controlPointOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const controlPointTwo = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };

    path.push(
      `C ${controlPointOne.x.toFixed(2)} ${controlPointOne.y.toFixed(2)}, ${controlPointTwo.x.toFixed(2)} ${controlPointTwo.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`,
    );
  }

  return path.join(' ');
}

function MiniSparkline(props: {
  values: SparklineValue[];
  tone: string;
  width?: number;
  height?: number;
  reserveSpace?: boolean;
}) {
  const { values, tone, width = 132, height = 44, reserveSpace = false } = props;
  if (!hasSparkline(values)) {
    if (!reserveSpace) {
      return null;
    }

    return (
      <span
        className={`speed-sparkline speed-sparkline-placeholder speed-${tone}`}
        aria-hidden="true"
      />
    );
  }

  const linePath = smoothSparklinePath(values, width, height);
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      className={`speed-sparkline speed-${tone}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      <path className="speed-sparkline-fill" d={areaPath} />
      <path className="speed-sparkline-line" d={linePath} />
    </svg>
  );
}

function SpeedGauge(props: {
  title: string;
  value?: number;
  unit: string;
  max: number;
  tone: string;
  sparklineValues: SparklineValue[];
}) {
  const { title, value, unit, max, tone, sparklineValues } = props;
  const formattedValue = formatNumber(value);
  const centerX = 240;
  const centerY = 218;
  const radius = 182;
  const startAngle = 205;
  const endAngle = -25;
  const sweep = startAngle - endAngle;
  const safeValue = Number.isFinite(value) ? Math.max(value ?? 0, 0) : 0;
  const percent = Math.min(1, safeValue / max);
  const visiblePercent = percent >= 0.015 ? percent : 0;
  const currentAngle = startAngle - sweep * visiblePercent;
  const majorTicks = Array.from({ length: 6 }, (_, index) => index);
  const minorTicks = Array.from({ length: 26 }, (_, index) => index);

  return (
    <div className={`speed-gauge speed-${tone}`}>
      <svg
        className="speed-gauge-svg"
        viewBox="0 0 480 310"
        role="img"
        aria-label={`${title} ${formatNumber(value)} ${unit}`}
      >
        <defs>
          <linearGradient id="speedGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1677ff" />
            <stop offset="55%" stopColor="#13c2c2" />
            <stop offset="100%" stopColor="#8a2be2" />
          </linearGradient>
          <filter id="speedGaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          className="speed-gauge-arc-bg"
          d={describeArc(centerX, centerY, radius, startAngle, endAngle)}
        />
        {visiblePercent > 0 ? (
          <path
            className="speed-gauge-arc-value"
            d={describeArc(centerX, centerY, radius, startAngle, currentAngle)}
          />
        ) : null}
        {minorTicks.map((tick) => {
          const angle = startAngle - (sweep * tick) / 25;
          const outer = polarToCartesian(centerX, centerY, radius - 4, angle);
          const inner = polarToCartesian(
            centerX,
            centerY,
            radius - (tick % 5 === 0 ? 28 : 19),
            angle,
          );

          return (
            <line
              key={tick}
              className={tick % 5 === 0 ? 'speed-gauge-tick-major' : 'speed-gauge-tick'}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
            />
          );
        })}
        {majorTicks.map((tick) => {
          const angle = startAngle - (sweep * tick) / 5;
          const point = polarToCartesian(centerX, centerY, radius - 54, angle);
          const label = formatGaugeTick(Math.round((max * tick) / 5));

          return (
            <text
              key={tick}
              className="speed-gauge-tick-label"
              x={point.x}
              y={point.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {label}
            </text>
          );
        })}
        {visiblePercent > 0 ? (
          <circle
            className="speed-gauge-end-dot"
            cx={polarToCartesian(centerX, centerY, radius, currentAngle).x}
            cy={polarToCartesian(centerX, centerY, radius, currentAngle).y}
            r="7"
          />
        ) : null}
      </svg>
      <div className="speed-gauge-content">
        <span className="speed-gauge-label">{title}</span>
        <strong>{formattedValue}</strong>
        <span className="speed-gauge-unit">{unit}</span>
        <MiniSparkline
          values={sparklineValues}
          tone={tone}
          width={150}
          height={30}
          reserveSpace
        />
      </div>
    </div>
  );
}

const SpeedTestPage: React.FC = () => {
  const intl = useIntl();
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();
  const t = (id: string, values?: Record<string, any>) =>
    intl.formatMessage({ id }, values);
  const [phase, setPhase] = useState<TestPhase>('idle');
  const [activeRound, setActiveRound] = useState(0);
  const [testBytes, setTestBytes] = useState(TEST_SIZE_OPTIONS[0].value);
  const [progress, setProgress] = useState(0);
  const [displayMetric, setDisplayMetric] = useState<MetricKey>('download');
  const [liveValues, setLiveValues] = useState({
    latencyMs: undefined as number | undefined,
    jitterMs: undefined as number | undefined,
    downloadMbps: undefined as number | undefined,
    uploadMbps: undefined as number | undefined,
  });
  const [currentResult, setCurrentResult] = useState<SpeedResult>();
  const [roundDetails, setRoundDetails] = useState<SpeedRoundResult[]>([]);
  const [history, setHistory] = useState<SpeedResult[]>([]);
  const [sparklineSeries, setSparklineSeries] = useState<SparklineSeries>(
    emptySparklineSeries,
  );
  const abortRef = useRef<AbortController>();
  const sparklineSampleBufferRef = useRef<SparklineSampleBuffer>(
    emptySparklineSampleBuffer(),
  );

  const running =
    phase === 'latency' || phase === 'download' || phase === 'upload';

  const serverName = useMemo(
    () => getServerName(t('speedTest.server.current')),
    [intl.locale],
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

  const gaugeMax = useMemo(
    () => getGaugeMax(activeMetric, gaugeValue, history),
    [activeMetric, gaugeValue, history],
  );

  const phaseText = useMemo(() => {
    const label = t(PHASE_LABEL_ID[phase]);
    if (!running) {
      return label;
    }

    return t('speedTest.phase.round', {
      label,
      round: activeRound,
      total: ROUND_COUNT,
    });
  }, [activeRound, phase, running, intl.locale]);

  const appendSparklineSample = (metric: MetricKey, value: number) => {
    setSparklineSeries((prevSeries) => ({
      ...prevSeries,
      [metric]: appendSparklineValue(prevSeries[metric], value),
    }));
  };

  const flushSparklineSamples = (metric: MetricKey) => {
    const buffer = sparklineSampleBufferRef.current[metric];
    if (!buffer.length) {
      return;
    }

    const nextValue = median(buffer);
    sparklineSampleBufferRef.current[metric] = [];
    appendSparklineSample(metric, nextValue);
  };

  const bufferSparklineSample = (metric: MetricKey, value?: number) => {
    if (value === undefined || !Number.isFinite(value)) {
      return;
    }

    if (metric === 'ping' || metric === 'jitter') {
      appendSparklineSample(metric, value);
      return;
    }

    const buffer = sparklineSampleBufferRef.current[metric];
    buffer.push(value);

    if (buffer.length < SPARKLINE_REFRESH_SAMPLE_COUNT) {
      return;
    }

    flushSparklineSamples(metric);
  };

  const metricCards = useMemo(
    () => [
      {
        key: 'download' as MetricKey,
        title: t('speedTest.metric.download'),
        value: liveValues.downloadMbps ?? currentResult?.downloadMbps,
        unit: t('speedTest.unit.mbps'),
        icon: <ArrowDownOutlined />,
        color: '#1677ff',
        tone: 'blue',
        sparklineValues: sparklineSeries.download,
      },
      {
        key: 'upload' as MetricKey,
        title: t('speedTest.metric.upload'),
        value: liveValues.uploadMbps ?? currentResult?.uploadMbps,
        unit: t('speedTest.unit.mbps'),
        icon: <ArrowUpOutlined />,
        color: '#8a2be2',
        tone: 'purple',
        sparklineValues: sparklineSeries.upload,
      },
      {
        key: 'ping' as MetricKey,
        title: t('speedTest.metric.ping'),
        value: liveValues.latencyMs ?? currentResult?.latencyMs,
        unit: t('speedTest.unit.ms'),
        icon: <DashboardOutlined />,
        color: '#13c2c2',
        tone: 'cyan',
        sparklineValues: sparklineSeries.ping,
      },
      {
        key: 'jitter' as MetricKey,
        title: t('speedTest.metric.jitter'),
        value: liveValues.jitterMs ?? currentResult?.jitterMs,
        unit: t('speedTest.unit.ms'),
        icon: <NodeIndexOutlined />,
        color: '#fa8c16',
        tone: 'orange',
        sparklineValues: sparklineSeries.jitter,
      },
    ],
    [currentResult, liveValues, sparklineSeries, intl.locale],
  );

  const chartData = useMemo(
    () => ({
      labels: history
        .slice()
        .reverse()
        .map((item) => item.time),
      datasets: [
        {
          label: t('speedTest.metric.download'),
          data: history
            .slice()
            .reverse()
            .map((item) => item.downloadMbps),
          borderColor: '#1677ff',
          backgroundColor: 'rgba(22, 119, 255, 0.12)',
          borderWidth: 3,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
        },
        {
          label: t('speedTest.metric.upload'),
          data: history
            .slice()
            .reverse()
            .map((item) => item.uploadMbps),
          borderColor: '#8a2be2',
          backgroundColor: 'rgba(138, 43, 226, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 4,
        },
      ],
    }),
    [history, intl.locale],
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
            label: (context: any) =>
              t('speedTest.chart.tooltip', {
                label: context.dataset.label,
                value: formatNumber(context.parsed.y),
                unit: t('speedTest.unit.mbps'),
              }),
          },
        },
      },
    }),
    [intl.locale],
  );

  const roundColumns = useMemo<ColumnsType<SpeedRoundResult>>(
    () => [
      {
        title: t('speedTest.table.round'),
        dataIndex: 'round',
      },
      {
        title: t('speedTest.metric.ping'),
        dataIndex: 'latencyMs',
        render: (value?: number) =>
          t('speedTest.valueWithUnit', {
            value: formatNumber(value, 1),
            unit: t('speedTest.unit.ms'),
          }),
      },
      {
        title: t('speedTest.metric.download'),
        dataIndex: 'downloadMbps',
        render: (value?: number) =>
          t('speedTest.valueWithUnit', {
            value: formatNumber(value),
            unit: t('speedTest.unit.mbps'),
          }),
      },
      {
        title: t('speedTest.metric.upload'),
        dataIndex: 'uploadMbps',
        render: (value?: number) =>
          t('speedTest.valueWithUnit', {
            value: formatNumber(value),
            unit: t('speedTest.unit.mbps'),
          }),
      },
    ],
    [intl.locale],
  );

  const updateRound = (
    roundIndex: number,
    values: Partial<SpeedRoundResult>,
  ) => {
    setRoundDetails((prev) =>
      prev.map((round, index) =>
        index === roundIndex ? { ...round, ...values } : round,
      ),
    );
  };

  const setOverallProgress = (completedUnits: number, phasePercent = 0) => {
    setProgress(
      Math.min(
        100,
        Math.round(
          ((completedUnits + phasePercent / 100) / TOTAL_PROGRESS_UNITS) * 100,
        ),
      ),
    );
  };

  const stopTest = () => {
    abortRef.current?.abort();
    abortRef.current = undefined;
    setPhase('idle');
    setActiveRound(0);
    setProgress(0);
  };

  const startTest = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    const nextRounds = initialRounds();
    abortRef.current = controller;
    setCurrentResult(undefined);
    setRoundDetails(nextRounds);
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
        nextRounds[index] = { ...nextRounds[index], latencyMs };
        updateRound(index, { latencyMs });
        completedUnits += 1;
        setOverallProgress(completedUnits);
      }

      setDisplayMetric('download');
      setPhase('download');
      for (let index = 0; index < ROUND_COUNT; index += 1) {
        setActiveRound(index + 1);
        const downloadMbps = await measureDownload(
          testBytes,
          controller.signal,
          (percent, currentMbps) => {
            setOverallProgress(completedUnits, percent);
            if (currentMbps !== undefined) {
              setLiveValues((prev) => ({
                ...prev,
                downloadMbps: currentMbps,
              }));
              bufferSparklineSample('download', currentMbps);
            }
          },
        );
        flushSparklineSamples('download');
        downloadSamples.push(downloadMbps);
        setLiveValues((prev) => ({ ...prev, downloadMbps }));
        nextRounds[index] = { ...nextRounds[index], downloadMbps };
        updateRound(index, { downloadMbps });
        completedUnits += 1;
        setOverallProgress(completedUnits);
      }

      setDisplayMetric('upload');
      setPhase('upload');
      for (let index = 0; index < ROUND_COUNT; index += 1) {
        setActiveRound(index + 1);
        const uploadMbps = await measureUpload(
          testBytes,
          controller.signal,
          (percent, currentMbps) => {
            setOverallProgress(completedUnits, percent);
            if (currentMbps !== undefined) {
              setLiveValues((prev) => ({ ...prev, uploadMbps: currentMbps }));
              bufferSparklineSample('upload', currentMbps);
            }
          },
        );
        flushSparklineSamples('upload');
        uploadSamples.push(uploadMbps);
        setLiveValues((prev) => ({ ...prev, uploadMbps }));
        nextRounds[index] = { ...nextRounds[index], uploadMbps };
        updateRound(index, { uploadMbps });
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
      setRoundDetails(nextRounds);
      const nextHistory = [result, ...history].slice(0, 10);
      if (history.length === 0) {
        setSparklineSeries(seedSparklineSeries(nextHistory));
      } else {
        setSparklineSeries((prevSeries) => ({
          download: appendSparklineValue(
            prevSeries.download,
            result.downloadMbps,
          ),
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
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      console.error(err);
      setPhase('error');
      messageApi.error(err?.message || t('speedTest.error.failed'));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = undefined;
      }
    }
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return (
    <PageContainer
      ghost
      className="speed-page-container"
      header={{
        title: '',
        breadcrumbRender: () => {
          return <></>;
        },
      }}
    >
      {contextHolder}
      <div
        className="speed-page"
        style={
          {
            '--speed-primary': token.colorPrimary,
            '--speed-primary-hover': token.colorPrimaryHover,
            '--speed-primary-shadow': token.colorPrimaryBg,
          } as React.CSSProperties
        }
      >
        <section className="speed-hero">
          <div className="speed-hero-copy">
            <Typography.Title level={1}>
              {t('speedTest.hero.titleLine1')}
              <br />
              {t('speedTest.hero.titleLine2')}
            </Typography.Title>
            <Typography.Paragraph>
              {t('speedTest.hero.description')}
            </Typography.Paragraph>
            <Space wrap>
              <Button
                type="primary"
                size="large"
                danger={running}
                icon={running ? <StopOutlined /> : <DashboardOutlined />}
                onClick={running ? stopTest : startTest}
              >
                {t(
                  running
                    ? 'speedTest.action.stop'
                    : 'speedTest.action.start',
                )}
              </Button>
            </Space>
            <div className="speed-hero-controls">
              <ThunderboltOutlined />
              <span>{t('speedTest.testSize')}</span>
              <Select
                className="speed-size-select"
                popupClassName="speed-size-dropdown"
                value={testBytes}
                options={TEST_SIZE_OPTIONS}
                disabled={running}
                onChange={setTestBytes}
              />
            </div>
          </div>

          <div className="speed-gauge-wrap">
            <SpeedGauge
              title={
                metricCards.find((item) => item.key === activeMetric)?.title ??
                t('speedTest.metric.download')
              }
              value={gaugeValue}
              unit={gaugeUnit}
              max={gaugeMax}
              tone={
                metricCards.find((item) => item.key === activeMetric)?.tone ??
                'blue'
              }
              sparklineValues={
                metricCards.find((item) => item.key === activeMetric)
                  ?.sparklineValues ?? []
              }
            />
            <div className="speed-phase">
              <Typography.Text strong>{phaseText}</Typography.Text>
              <Progress
                percent={progress}
                status={phase === 'error' ? 'exception' : undefined}
                showInfo={false}
                strokeLinecap="round"
              />
            </div>
          </div>

          <div className="speed-side-metrics">
            {metricCards.map((metric) => (
              <button
                key={metric.key}
                className={`speed-metric-card ${
                  hasSparkline(metric.sparklineValues)
                    ? 'speed-metric-card-with-chart'
                    : ''
                } speed-${metric.tone}`}
                type="button"
                onClick={() => {
                  if (!running) {
                    setDisplayMetric(metric.key);
                  }
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
                <MiniSparkline
                  values={metric.sparklineValues}
                  tone={metric.tone}
                />
              </button>
            ))}
          </div>
        </section>

        <Card className="speed-summary-card">
          <Row gutter={[0, 16]}>
            {metricCards.map((metric) => (
              <Col xs={24} sm={12} lg={5} key={metric.key}>
                <div className={`speed-summary-item speed-${metric.tone}`}>
                  <span className="speed-summary-icon">{metric.icon}</span>
                  <span>
                    <small>{metric.title}</small>
                    <strong>
                      {formatNumber(
                        metric.value,
                        metric.key === 'ping' || metric.key === 'jitter'
                          ? 1
                          : 2,
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
              </Col>
            ))}
            <Col xs={24} lg={4}>
              <div className="speed-summary-item speed-server">
                <span className="speed-summary-icon">
                  <GlobalOutlined />
                </span>
                <span>
                  <small>{t('speedTest.server.label')}</small>
                  <strong>{serverName}</strong>
                  <small>{t('speedTest.server.current')}</small>
                </span>
              </div>
            </Col>
          </Row>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              title={t('speedTest.recent.title')}
              className="speed-panel speed-results-card"
            >
              <div className="speed-recent-list">
                {history.length ? (
                  history.slice(0, 5).map((item) => (
                    <div className="speed-recent-row" key={item.key}>
                      <WifiOutlined className="speed-result-wifi" />
                      <span className="speed-recent-time">{item.time}</span>
                      <span className="speed-recent-metric speed-blue">
                        <ArrowDownOutlined />
                        <strong>{formatNumber(item.downloadMbps)}</strong>
                        <small>{t('speedTest.unit.mbps')}</small>
                      </span>
                      <span className="speed-recent-metric speed-purple">
                        <ArrowUpOutlined />
                        <strong>{formatNumber(item.uploadMbps)}</strong>
                        <small>{t('speedTest.unit.mbps')}</small>
                      </span>
                      <span className="speed-recent-metric speed-cyan">
                        <DashboardOutlined />
                        <strong>{formatNumber(item.latencyMs, 1)}</strong>
                        <small>{t('speedTest.unit.ms')}</small>
                      </span>
                      <span className="speed-recent-metric speed-orange">
                        <NodeIndexOutlined />
                        <strong>{formatNumber(item.jitterMs, 1)}</strong>
                        <small>{t('speedTest.unit.ms')}</small>
                      </span>
                      <RightOutlined className="speed-recent-arrow" />
                    </div>
                  ))
                ) : (
                  <div className="speed-recent-empty">
                    {t('speedTest.recent.empty')}
                  </div>
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              title={t('speedTest.chart.title', {
                unit: t('speedTest.unit.mbps'),
              })}
              className="speed-panel speed-results-card"
            >
              <div className="speed-chart">
                <Line data={chartData} options={chartOptions} />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default SpeedTestPage;
