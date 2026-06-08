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
import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const MAX_POINTS = 60;

type Sample = { time: string; value: number | Record<string, number> };

type Metric = { key: string; label: string; color: string; fillColor: string };

export function MonitorChart({
  title,
  sample,
  min = 0,
  max = 100,
  autoScaleY = false,
  metrics,
  valueFormatter = (v) => v.toFixed(1),
}: {
  title: string;
  sample?: Sample;
  min?: number;
  max?: number;
  autoScaleY?: boolean;
  metrics?: Metric[];
  valueFormatter?: (v: number, key?: string) => string;
}) {
  const [labels, setLabels] = useState<string[]>(Array(MAX_POINTS).fill(''));
  const [datasets, setDatasets] = useState<Record<string, (number | null)[]>>({});

  const metricDefs = useMemo(() => {
    if (metrics?.length) return metrics;
    return [{ key: 'default', label: title, color: 'rgb(214, 93, 58)', fillColor: 'rgba(214, 93, 58, 0.15)' }];
  }, [metrics, title]);

  useEffect(() => {
    if (!sample) return;
    setLabels((prev) => [...prev.slice(1), sample.time.slice(11, 19)]);
    setDatasets((prev) => {
      const next = { ...prev };
      metricDefs.forEach((m) => {
        const arr = [...(next[m.key] ?? Array(MAX_POINTS).fill(null))].slice(1);
        const val = typeof sample.value === 'number' ? sample.value : (sample.value as Record<string, number>)[m.key] ?? 0;
        arr.push(val);
        next[m.key] = arr;
      });
      return next;
    });
  }, [sample, metricDefs]);

  const chartData = {
    labels,
    datasets: metricDefs.map((m) => ({
      label: m.label,
      data: datasets[m.key] ?? Array(MAX_POINTS).fill(null),
      borderColor: m.color,
      backgroundColor: m.fillColor,
      fill: true,
      pointRadius: 0,
      tension: 0.4,
    })),
  };

  const latestValue = sample
    ? typeof sample.value === 'number'
      ? valueFormatter(sample.value)
      : metricDefs.map((m) => `${m.label}: ${valueFormatter((sample.value as Record<string, number>)[m.key] ?? 0, m.key)}`).join(' · ')
    : '--';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-muted-foreground text-sm">{latestValue}</p>
      </CardHeader>
      <CardContent>
        <Line
          data={chartData}
          options={{
            responsive: true,
            animation: false,
            scales: {
              y: { min: autoScaleY ? undefined : min, max: autoScaleY ? undefined : max, beginAtZero: true },
              x: { display: false },
            },
            plugins: { legend: { display: metricDefs.length > 1 } },
          }}
        />
      </CardContent>
    </Card>
  );
}
