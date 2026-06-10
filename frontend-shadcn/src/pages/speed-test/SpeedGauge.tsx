import { memo } from 'react';

import { MiniSparkline } from '@/pages/speed-test/MiniSparkline';
import {
  describeArc,
  formatGaugeTick,
  formatNumber,
  polarToCartesian,
} from '@/pages/speed-test/utils';
import type { SparklineValue } from '@/pages/speed-test/types';

function SpeedGaugeInner({
  title,
  value,
  unit,
  max,
  tone,
  sparklineValues,
}: {
  title: string;
  value?: number;
  unit: string;
  max: number;
  tone: string;
  sparklineValues: SparklineValue[];
}) {
  const isThroughput = unit.toLowerCase().includes('mbps');
  const valuePlaceholder = isThroughput ? '00,000.00' : '000.00';

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
        <strong className="speed-gauge-value">
          <span className="speed-gauge-value-placeholder" aria-hidden="true">
            {valuePlaceholder}
          </span>
          <span className="speed-gauge-value-current">{formatNumber(value)}</span>
        </strong>
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

export const SpeedGauge = memo(SpeedGaugeInner);
