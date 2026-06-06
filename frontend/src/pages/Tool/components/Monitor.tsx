import React, { useEffect, useMemo, useState } from 'react';
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const DEFAULT_MAX_DATA_POINTS = 60;
const DEFAULT_COLOR = 'rgb(54, 162, 235)';
const DEFAULT_FILL_COLOR = 'rgba(54, 162, 235, 0.2)';

type MetricValue = number | Record<string, number>;

interface MonitorSample {
  time: string;
  value: MetricValue;
}

interface MonitorMetric {
  key: string;
  label: string;
  color?: string;
  fillColor?: string;
}

interface MonitorProps {
  title: string;
  datasetLabel?: string;
  yAxisTitle?: string;
  xAxisTitle: string;
  emptyValueText: string;
  min?: number;
  max?: number;
  autoScaleY?: boolean;
  color?: string;
  fillColor?: string;
  maxDataPoints?: number;
  metrics?: MonitorMetric[];
  sample?: MonitorSample;
  valueFormatter?: (value: number, metricKey?: string) => string;
}

function buildDataset(metric: Required<MonitorMetric>, maxDataPoints: number) {
  return {
    label: metric.label,
    data: new Array<number | null>(maxDataPoints).fill(null),
    borderColor: metric.color,
    backgroundColor: metric.fillColor,
    borderWidth: 2,
    fill: true,
    pointRadius: 0,
    tension: 0.4,
  };
}

function defaultValueFormatter(value: number, emptyValueText: string) {
  return Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })
    : emptyValueText;
}

export default function Monitor(props: MonitorProps) {
  const {
    title,
    datasetLabel,
    yAxisTitle,
    xAxisTitle,
    emptyValueText,
    min = 0,
    max = 100,
    autoScaleY = false,
    color = DEFAULT_COLOR,
    fillColor = DEFAULT_FILL_COLOR,
    maxDataPoints = DEFAULT_MAX_DATA_POINTS,
    metrics,
    sample,
    valueFormatter,
  } = props;

  const metricDefinitions = useMemo<Required<MonitorMetric>[]>(() => {
    if (metrics?.length) {
      return metrics.map((metric, index) => ({
        key: metric.key,
        label: metric.label,
        color:
          metric.color || (index === 0 ? DEFAULT_COLOR : 'rgb(255, 99, 132)'),
        fillColor:
          metric.fillColor ||
          (index === 0 ? DEFAULT_FILL_COLOR : 'rgba(255, 99, 132, 0.2)'),
      }));
    }

    return [
      {
        key: 'value',
        label: datasetLabel ?? '',
        color,
        fillColor,
      },
    ];
  }, [color, datasetLabel, fillColor, metrics]);

  const metricSignature = useMemo(
    () =>
      JSON.stringify(
        metricDefinitions.map(({ key, label, color, fillColor }) => ({
          key,
          label,
          color,
          fillColor,
        })),
      ),
    [metricDefinitions],
  );

  const [chartData, setChartData] = useState(() => ({
    labels: new Array<string>(maxDataPoints).fill(''),
    datasets: metricDefinitions.map((metric) =>
      buildDataset(metric, maxDataPoints),
    ),
  }));

  const yAxisMax = useMemo(() => {
    if (!autoScaleY) {
      return max;
    }

    const values = chartData.datasets.flatMap((dataset) =>
      dataset.data.filter(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value),
      ),
    );
    const maxValue = values.length ? Math.max(...values) : 0;

    return Math.max(maxValue * 1.1, 1);
  }, [autoScaleY, chartData.datasets, max]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        y: {
          min,
          max: yAxisMax,
          title: { display: Boolean(yAxisTitle), text: yAxisTitle },
        },
        x: {
          title: { display: true, text: xAxisTitle },
          ticks: { maxTicksLimit: 6 },
        },
      },
      plugins: {
        legend: { display: metricDefinitions.length > 1 },
      },
    }),
    [metricDefinitions.length, min, xAxisTitle, yAxisMax, yAxisTitle],
  );

  const currentValues = useMemo(
    () =>
      metricDefinitions.map((metric, index) => {
        const value =
          !sample
            ? undefined
            : typeof sample.value === 'number'
            ? index === 0
              ? sample.value
              : undefined
            : sample.value[metric.key];

        return {
          key: metric.key,
          label: metric.label,
          color: metric.color,
          value,
        };
      }),
    [metricDefinitions, sample],
  );

  useEffect(() => {
    setChartData({
      labels: new Array<string>(maxDataPoints).fill(''),
      datasets: metricDefinitions.map((metric) =>
        buildDataset(metric, maxDataPoints),
      ),
    });
  }, [maxDataPoints, metricDefinitions, metricSignature]);

  useEffect(() => {
    if (!sample) {
      return;
    }

    setChartData((prevData) => {
      const newLabels = [...prevData.labels, sample.time];
      if (newLabels.length > maxDataPoints) {
        newLabels.shift();
      }

      const datasets = prevData.datasets.map((dataset, index) => {
        const metric = metricDefinitions[index];
        const metricValue =
          typeof sample.value === 'number'
            ? index === 0
              ? sample.value
              : null
            : sample.value[metric.key] ?? null;
        const data = [...dataset.data, metricValue];

        if (data.length > maxDataPoints) {
          data.shift();
        }

        return {
          ...dataset,
          data,
        };
      });

      return {
        ...prevData,
        labels: newLabels,
        datasets,
      };
    });
  }, [maxDataPoints, metricDefinitions, sample]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{title}</h2>
      <div style={styles.valueRow}>
        {currentValues.map((item) => (
          <div key={item.key} style={styles.valueItem}>
            <span style={{ ...styles.valueMarker, backgroundColor: item.color }} />
            <span style={styles.valueLabel}>{item.label}</span>
            <span style={styles.valueText}>
              {item.value === undefined
                ? emptyValueText
                : valueFormatter
                ? valueFormatter(item.value, item.key)
                : defaultValueFormatter(item.value, emptyValueText)}
            </span>
          </div>
        ))}
      </div>
      <div style={styles.chartWrapper}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    marginTop: '20px',
    width: '100%',
    minWidth: 0,
  },
  title: {
    color: '#333',
    marginBottom: '8px',
  },
  valueRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  valueItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
    minWidth: '120px',
  },
  valueMarker: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flex: '0 0 auto',
  },
  valueLabel: {
    color: '#666',
    fontSize: '13px',
  },
  valueText: {
    color: '#222',
    fontSize: '20px',
    fontWeight: 600,
  },
  chartWrapper: {
    width: '100%',
    height: '400px',
    padding: '20px',
  },
};
