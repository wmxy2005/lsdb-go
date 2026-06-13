import type { TestPhase } from '@/pages/speed-test/types';

export const ROUND_COUNT = 3;
export const PHASE_COUNT = 3;
export const TOTAL_PROGRESS_UNITS = ROUND_COUNT * PHASE_COUNT;
export const SPARKLINE_POINT_COUNT = 16;
export const SPARKLINE_REFRESH_SAMPLE_COUNT = 10;
export const MB = 1024 * 1024;
export const UPLOAD_CHUNK_BYTES = 4 * MB;
export const SPEED_TEST_CONCURRENCY = 6;
// Min gap between progress emissions during a transfer. Network chunks arrive
// far faster than this on fast links; throttling here keeps live-value and
// sparkline state updates bounded regardless of chunk rate. Byte accounting is
// unaffected — only the UI emission is throttled.
export const PROGRESS_REPORT_INTERVAL_MS = 100;

export const TEST_SIZE_KEYS = ['16', '64', '128', '256', '512'] as const;

export const TEST_SIZE_OPTIONS = [
  { key: '16' as const, value: 16 * MB },
  { key: '64' as const, value: 64 * MB },
  { key: '128' as const, value: 128 * MB },
  { key: '256' as const, value: 256 * MB },
  { key: '512' as const, value: 512 * MB },
];

export const PHASE_LABEL_KEY: Record<TestPhase, string> = {
  idle: 'speedTest.phase.ready',
  latency: 'speedTest.phase.latency',
  download: 'speedTest.phase.download',
  upload: 'speedTest.phase.upload',
  done: 'speedTest.phase.done',
  error: 'speedTest.phase.error',
};
