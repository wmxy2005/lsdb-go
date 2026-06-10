import { speedTestUrl } from '@/api/cmd';
import { ROUND_COUNT, SPARKLINE_POINT_COUNT } from '@/pages/speed-test/constants';
import type {
  MetricKey,
  SparklineSeries,
  SparklineValue,
  SpeedResult,
  SpeedRoundResult,
} from '@/pages/speed-test/types';

export function formatNumber(value?: number, fractionDigits = 2) {
  if (value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  });
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const sortedValues = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[middle - 1] + sortedValues[middle]) / 2
    : sortedValues[middle];
}

export function calculateJitter(values: number[]) {
  if (values.length < 2) return 0;
  const deltas = values.slice(1).map((value, index) => Math.abs(value - values[index]));
  return median(deltas);
}

export function initialRounds(): SpeedRoundResult[] {
  return Array.from({ length: ROUND_COUNT }, (_, index) => ({
    key: String(index + 1),
    round: index + 1,
  }));
}

export function getServerName(fallback: string) {
  try {
    const url = new URL(speedTestUrl('ping'), window.location.origin);
    return url.host || url.origin;
  } catch {
    return fallback;
  }
}

export function polarToCartesian(
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

export function describeArc(
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
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, sweepFlag, end.x, end.y,
  ].join(' ');
}

export function getGaugeMax(
  metric: MetricKey,
  value: number | undefined,
  history: SpeedResult[],
) {
  const historicalMax = history.reduce((maxValue, item) => {
    const nextValue =
      metric === 'download' ? item.downloadMbps
      : metric === 'upload' ? item.uploadMbps
      : metric === 'ping' ? item.latencyMs
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

export function formatGaugeTick(value: number) {
  if (value >= 1000) return `${value / 1000}k`;
  return String(value);
}

function metricValueFromResult(result: SpeedResult, metric: MetricKey) {
  switch (metric) {
    case 'download': return result.downloadMbps;
    case 'upload': return result.uploadMbps;
    case 'ping': return result.latencyMs;
    case 'jitter': return result.jitterMs;
    default: return 0;
  }
}

export function emptySparklineSeries(): SparklineSeries {
  return { download: [], upload: [], ping: [], jitter: [] };
}

export function emptySparklineSampleBuffer() {
  return { download: [], upload: [], ping: [], jitter: [] };
}

export function appendSparklineValue(values: SparklineValue[], value: number): SparklineValue[] {
  if (!Number.isFinite(value)) return values;
  const nextValues = [...values, value];
  return nextValues.slice(Math.max(0, nextValues.length - SPARKLINE_POINT_COUNT));
}

export function seedSparklineSeries(history: SpeedResult[]): SparklineSeries {
  const baseSeries = emptySparklineSeries();
  const chronologicalHistory = history.slice(0, SPARKLINE_POINT_COUNT).reverse();

  if (chronologicalHistory.length === 1) {
    const [firstResult] = chronologicalHistory;
    const latencyValues: number[] = [];

    firstResult.rounds.forEach((round) => {
      if (round.downloadMbps !== undefined && Number.isFinite(round.downloadMbps)) {
        baseSeries.download = appendSparklineValue(baseSeries.download, round.downloadMbps);
      }
      if (round.uploadMbps !== undefined && Number.isFinite(round.uploadMbps)) {
        baseSeries.upload = appendSparklineValue(baseSeries.upload, round.uploadMbps);
      }
      if (round.latencyMs !== undefined && Number.isFinite(round.latencyMs)) {
        latencyValues.push(round.latencyMs);
        baseSeries.ping = appendSparklineValue(baseSeries.ping, round.latencyMs);
        baseSeries.jitter = appendSparklineValue(baseSeries.jitter, calculateJitter(latencyValues));
      }
    });
    return baseSeries;
  }

  chronologicalHistory.forEach((result) => {
    (['download', 'upload', 'ping', 'jitter'] as MetricKey[]).forEach((metric) => {
      baseSeries[metric] = appendSparklineValue(
        baseSeries[metric],
        metricValueFromResult(result, metric),
      );
    });
  });

  return baseSeries;
}

export function hasSparkline(values: SparklineValue[]) {
  return values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  ).length >= 2;
}

function getSparklinePoints(values: SparklineValue[], width: number, height: number) {
  const paddedValues = [
    ...new Array<SparklineValue>(Math.max(0, SPARKLINE_POINT_COUNT - values.length)).fill(null),
    ...values.slice(-SPARKLINE_POINT_COUNT),
  ];
  const finiteValues = paddedValues.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  const range = maxValue - minValue || 1;
  const horizontalStep = width / (SPARKLINE_POINT_COUNT - 1);

  return paddedValues
    .map((value, index) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const x = index * horizontalStep;
      const y = height - ((value - minValue) / range) * (height * 0.72) - height * 0.14;
      return { x, y };
    })
    .filter((point): point is { x: number; y: number } => Boolean(point));
}

export function smoothSparklinePath(values: SparklineValue[], width: number, height: number) {
  if (!hasSparkline(values)) return '';

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
