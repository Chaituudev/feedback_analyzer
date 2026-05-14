import React, { useEffect, useRef, useState } from 'react';
import {
  CategoryScale,
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function TrendLineChart({ trends }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const values = Array.isArray(trends) ? trends : [];

    try {
      setChartError('');
      chartRef.current = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: values.map((row) => row.date),
          datasets: [
            {
              label: 'Feedback Count',
              data: values.map((row) => row.count),
              borderColor: '#0056b3',
              backgroundColor: 'rgba(0, 86, 179, 0.15)',
              tension: 0.35,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0
              }
            }
          }
        }
      });
    } catch (error) {
      setChartError('Trend chart could not be rendered.');
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [trends]);

  return (
    <div className="chart-card">
      <h3>Feedback Trends</h3>
      {chartError ? <p className="error">{chartError}</p> : null}
      <div className="chart-wrap" style={chartError ? { display: 'none' } : undefined}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
