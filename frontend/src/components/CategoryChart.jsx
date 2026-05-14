import React, { useEffect, useRef, useState } from 'react';
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

export default function CategoryChart({ distribution }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const values = distribution || { teaching: 0, infrastructure: 0, 'course content': 0, general: 0 };
    const total = (values.teaching || 0) + (values.infrastructure || 0) + (values['course content'] || 0) + (values.general || 0);

    if (total === 0) {
      setChartError('No category data yet. Submit feedback to populate this chart.');
      return () => {};
    }

    try {
      setChartError('');
      chartRef.current = new Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Teaching', 'Infrastructure', 'Course Content', 'General'],
          datasets: [
            {
              data: [
                values.teaching || 0,
                values.infrastructure || 0,
                values['course content'] || 0,
                values.general || 0
              ],
              backgroundColor: ['#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280']
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      setChartError('Category chart could not be rendered.');
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [distribution]);

  return (
    <div className="chart-card">
      <h3>Feedback by Category</h3>
      {chartError ? <p className="error">{chartError}</p> : null}
      <div className="chart-wrap" style={chartError ? { display: 'none' } : undefined}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
