import React, { useEffect, useRef, useState } from 'react';
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

export default function SentimentPieChart({ distribution }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [chartError, setChartError] = useState('');

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const values = distribution || { positive: 0, negative: 0, neutral: 0 };
    const total = (values.positive || 0) + (values.negative || 0) + (values.neutral || 0);

    if (total === 0) {
      setChartError('No sentiment data yet. Submit feedback to populate this chart.');
      return () => {};
    }

    try {
      setChartError('');
      chartRef.current = new Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Positive', 'Negative', 'Neutral'],
          datasets: [
            {
              data: [values.positive || 0, values.negative || 0, values.neutral || 0],
              backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
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
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      setChartError('Sentiment chart could not be rendered.');
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
      <h3>Sentiment Distribution</h3>
      {chartError ? <p className="error">{chartError}</p> : null}
      <div className="chart-wrap" style={chartError ? { display: 'none' } : undefined}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
