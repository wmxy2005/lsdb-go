import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// 注册 Chart.js 必要的组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MAX_DATA_POINTS = 60;

interface MonitorProps {
  onChange?: any | undefined,
}

export default function Monitor(props : MonitorProps) {
  // 使用 useRef 保存当前的 CPU 值，这样修改它时不会触发组件重新渲染
  const currentCpuUsage = useRef(0);
  const { onChange } = props;

  // 初始化状态（预填充 MAX_DATA_POINTS 条空记录）
  const [chartData, setChartData] = useState(() => {
    const initialLabels = new Array(MAX_DATA_POINTS).fill('');
    const initialData = new Array(MAX_DATA_POINTS).fill(null);
    
    return {
      labels: initialLabels,
      datasets: [
        {
          label: 'CPU 占用率',
          data: initialData,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          tension: 0.4,
        },
      ],
    };
  });

  // 图表配置项
  const options = {
    responsive: true,
    maintainAspectRatio: false, // 允许图表填满父容器的高度
    animation: false, // 关闭动画防止抖动
    scales: {
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: '占用率 (%)' },
      },
      x: {
        title: { display: true, text: '系统时间' },
        ticks: { maxTicksLimit: 6 },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  useEffect(() => {
    // 设置定时器
    const intervalId = setInterval(async () => {
      if(onChange) {
        let [success, timeLabel, newValue]  = await onChange();
        if(success){
          currentCpuUsage.current = newValue;

          // 更新 React 状态
          setChartData((prevData) => {
            // 浅拷贝数组，遵循 React 的不可变性（Immutability）原则
            const newLabels = [...prevData.labels];
            const newData = [...prevData.datasets[0].data];

            newLabels.push(timeLabel);
            newData.push(newValue);

            if (newLabels.length > MAX_DATA_POINTS) {
              newLabels.shift();
              newData.shift();
            }

            return {
              ...prevData,
              labels: newLabels,
              datasets: [
                {
                  ...prevData.datasets[0],
                  data: newData,
                },
              ],
            };
          });
        }
      }
    }, 1000);

    // 组件卸载时清理定时器，防止内存泄漏
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>实时 CPU 占用率 (%)</h2>
      <div style={styles.chartWrapper}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

// 简单的内联样式，你可以换成 CSS Modules 或 Tailwind
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    marginTop: '20px',
  },
  title: {
    color: '#333',
  },
  chartWrapper: {
    width: '90%',
    maxWidth: '900px',
    height: '400px', // 在 React 中通常需要给包裹层一个明确的高度
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  }
};