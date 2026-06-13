import { memo } from 'react';

import { hasSparkline, smoothSparklinePath } from '@/pages/speed-test/utils';
import type { SparklineValue } from '@/pages/speed-test/types';

function MiniSparklineInner({
  values,
  tone,
  width = 132,
  height = 44,
  reserveSpace = false,
}: {
  values: SparklineValue[];
  tone: string;
  width?: number;
  height?: number;
  reserveSpace?: boolean;
}) {
  if (!hasSparkline(values)) {
    if (!reserveSpace) return null;
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
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path className="speed-sparkline-fill" d={areaPath} />
      <path className="speed-sparkline-line" d={linePath} />
    </svg>
  );
}

export const MiniSparkline = memo(MiniSparklineInner);
