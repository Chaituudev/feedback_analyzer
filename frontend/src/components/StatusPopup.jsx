import React from 'react';

export default function StatusPopup({ open, title, message, actionLabel = 'Close', tone = 'success', onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="popup-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`popup-card popup-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-popup-title"
        aria-describedby="status-popup-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="popup-badge">{tone === 'success' ? 'Done' : 'Notice'}</div>
        <h2 id="status-popup-title">{title}</h2>
        <p id="status-popup-message">{message}</p>
        <div className="popup-actions">
          <button type="button" className="btn" onClick={onClose}>
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}