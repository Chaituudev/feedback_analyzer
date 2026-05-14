import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function FormTemplateSelector({ onSelectTemplate, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data } = await api.get('/form/templates/list');
        setTemplates(data.templates || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleSelectTemplate = async (templateId) => {
    try {
      const { data } = await api.get(`/form/templates/${templateId}`);
      onSelectTemplate(data.template);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load template');
    }
  };

  return (
    <div className="template-selector-backdrop" onClick={onClose}>
      <div className="template-selector-card" onClick={(e) => e.stopPropagation()}>
        <div className="template-selector-header">
          <h3>Select a Template</h3>
          <button type="button" className="template-close-btn" onClick={onClose}>×</button>
        </div>

        {loading && <p>Loading templates...</p>}
        {error && <p className="error">{error}</p>}

        <div className="template-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <h4>{template.title}</h4>
              <p>{template.description}</p>
              <button
                type="button"
                className="btn"
                onClick={() => handleSelectTemplate(template.id)}
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>

        {templates.length === 0 && !loading && (
          <p className="info">No templates available at the moment.</p>
        )}

        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Or Create from Scratch
        </button>
      </div>
    </div>
  );
}
