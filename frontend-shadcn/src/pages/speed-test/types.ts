export type TestPhase = 'idle' | 'latency' | 'download' | 'upload' | 'done' | 'error';

export type SpeedRoundResult = {
  key: string;
  round: number;
  latencyMs?: number;
  downloadMbps?: number;
  uploadMbps?: number;
};

export type SpeedResult = {
  key: string;
  time: string;
  latencyMs: number;
  jitterMs: number;
  downloadMbps: number;
  uploadMbps: number;
  bytes: number;
  rounds: SpeedRoundResult[];
};

export type MetricKey = 'download' | 'upload' | 'ping' | 'jitter';
export type SparklineValue = number | null;
export type SparklineSeries = Record<MetricKey, SparklineValue[]>;
export type SparklineSampleBuffer = Record<MetricKey, number[]>;
