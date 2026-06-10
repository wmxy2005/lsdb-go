import { authHeaders } from '@/api/client';
import { speedTestUrl } from '@/api/cmd';
import { SPEED_TEST_CONCURRENCY, UPLOAD_CHUNK_BYTES } from '@/pages/speed-test/constants';

function bytesToMbps(bytes: number, durationMs: number) {
  if (durationMs <= 0) return 0;
  return (bytes * 8) / (durationMs / 1000) / 1_000_000;
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

export async function measureLatency(signal: AbortSignal) {
  const start = performance.now();
  await checkedFetch(speedTestUrl('ping'), {
    headers: authHeaders(),
    credentials: 'include',
    cache: 'no-store',
    signal,
  });
  return performance.now() - start;
}

export async function measureDownload(
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
        if (done) break;
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

export async function measureUpload(
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
        if (settled) return;
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
        reportProgress(requestIndex, event.loaded || 0);
      };

      xhr.onload = () => {
        if (settled) return;
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
        if (settled) return;
        settled = true;
        cleanupUpload();
        reject(new Error('Upload failed'));
      };

      xhr.onabort = () => {
        if (settled) return;
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
