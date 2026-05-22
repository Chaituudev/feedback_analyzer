import React from 'react';

function clampPercentage(value) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export default function SentimentCircleChart({ title, sentiment, count, onClick }) {
  const total = Math.max(1, count || 0);
  const positivePct = clampPercentage(Math.round((sentiment.positive / total) * 100));
  const neutralPct = clampPercentage(Math.round((sentiment.neutral / total) * 100));
  const negativePct = clampPercentage(100 - positivePct - neutralPct);

  const chartStyle = {
    background: `conic-gradient(#16a34a 0% ${positivePct}%, #eab308 ${positivePct}% ${positivePct + neutralPct}%, #dc2626 ${positivePct + neutralPct}% 100%)`
  };

  const Component = onClick ? 'button' : 'div';

  return (
    <Component type={onClick ? 'button' : undefined} className={`circle-chart-card${onClick ? ' circle-chart-card-clickable' : ''}`} onClick={onClick}>
      <strong className="circle-chart-title">{title}</strong>
      <div className="circle-chart-wrap">
        <div className="circle-chart" style={chartStyle}>
          <div className="circle-chart-hole">
            <span className="circle-chart-count">{count}</span>
            <span className="circle-chart-label">feedbacks</span>
          </div>
        </div>
      </div>
      <div className="analysis-sentiment-row circle-chart-legend">
        <span className="sentiment-pill positive">P {sentiment.positive}</span>
        <span className="sentiment-pill neutral">N {sentiment.neutral}</span>
        <span className="sentiment-pill negative">Neg {sentiment.negative}</span>
      </div>
      <div className="circle-chart-percentages">
        <span>Positive {positivePct}%</span>
        <span>Neutral {neutralPct}%</span>
        <span>Negative {negativePct}%</span>
      </div>
    </Component>
  );
}