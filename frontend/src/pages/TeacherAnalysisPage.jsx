import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import api from '../services/api';

const TEACHER_DIMENSIONS = [
  { key: 'subject', label: 'Subject' },
  { key: 'class', label: 'Class' },
  { key: 'form', label: 'Form' }
];

function toId(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
}

function toLabel(item, dimension) {
  if (dimension === 'subject') return item.subjectId?.name || item.formId?.subjectId?.name || 'Unassigned Subject';
  if (dimension === 'class') return item.className || 'Unassigned Class';
  if (dimension === 'form') return item.formId?.title || 'Untitled Form';
  return 'Unknown';
}

function toDimensionKey(item, dimension) {
  if (dimension === 'subject') return toId(item.subjectId) || toId(item.formId?.subjectId) || 'none-subject';
  if (dimension === 'class') return item.className || 'none-class';
  if (dimension === 'form') return toId(item.formId) || 'none-form';
  return 'none';
}

function uniqueOptions(feedbacks, dimension) {
  const map = new Map();
  for (const item of feedbacks) {
    const key = toDimensionKey(item, dimension);
    if (!map.has(key)) {
      map.set(key, { value: key, label: toLabel(item, dimension) });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export default function TeacherAnalysisPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedDimensions, setSelectedDimensions] = useState(['subject', 'class']);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [formFilter, setFormFilter] = useState('all');
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/feedback');
        setFeedbacks((data.feedbacks || []).filter((item) => item.formId?.type !== 'complaint'));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const subjectOptions = useMemo(() => uniqueOptions(feedbacks, 'subject'), [feedbacks]);
  const classOptions = useMemo(() => uniqueOptions(feedbacks, 'class'), [feedbacks]);
  const formOptions = useMemo(() => uniqueOptions(feedbacks, 'form'), [feedbacks]);

  const filteredFeedbacks = useMemo(() => feedbacks.filter((item) => {
    const subjectKey = toDimensionKey(item, 'subject');
    const classKey = toDimensionKey(item, 'class');
    const formKey = toDimensionKey(item, 'form');

    return (subjectFilter === 'all' || subjectFilter === subjectKey)
      && (classFilter === 'all' || classFilter === classKey)
      && (formFilter === 'all' || formFilter === formKey);
  }), [feedbacks, subjectFilter, classFilter, formFilter]);

  const groupedBySelected = useMemo(() => {
    const output = {};

    for (const dimension of selectedDimensions) {
      const map = new Map();

      for (const item of filteredFeedbacks) {
        const key = toDimensionKey(item, dimension);
        const label = toLabel(item, dimension);
        const existing = map.get(key) || {
          key,
          label,
          dimension,
          count: 0,
          forms: new Map(),
          sentiment: { positive: 0, neutral: 0, negative: 0 }
        };

        existing.count += 1;
        const sentiment = item.sentiment === 'positive' || item.sentiment === 'negative' ? item.sentiment : 'neutral';
        existing.sentiment[sentiment] += 1;

        const formId = toId(item.formId) || 'none-form';
        const formTitle = item.formId?.title || 'Untitled Form';
        existing.forms.set(formId, formTitle);

        map.set(key, existing);
      }

      output[dimension] = Array.from(map.values()).map((group) => ({
        ...group,
        forms: Array.from(group.forms.entries()).map(([id, title]) => ({ id, title }))
      })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }

    return output;
  }, [filteredFeedbacks, selectedDimensions]);

  const activeGroupForms = useMemo(() => {
    if (!activeGroup) return [];

    const groups = groupedBySelected[activeGroup.dimension] || [];
    const found = groups.find((g) => g.key === activeGroup.key);
    return found?.forms || [];
  }, [activeGroup, groupedBySelected]);

  const toggleDimension = (dimension) => {
    setSelectedDimensions((prev) => {
      if (prev.includes(dimension)) {
        const next = prev.filter((item) => item !== dimension);
        return next.length ? next : prev;
      }
      return [...prev, dimension];
    });
  };

  return (
    <div className="page page-teacher">
      <NavBar title="Teacher Dashboard" />
      <main className="content-grid single-column">
        <section className="card">
          <div className="row-actions" style={{ justifyContent: 'space-between' }}>
            <h2>Filtered Analysis</h2>
            <Link className="btn btn-secondary" to="/teacher">Back to Dashboard</Link>
          </div>
          {loading && <p>Loading analysis...</p>}
          {error && <p className="error">{error}</p>}

          <div className="analysis-filters">
            <h3>Group By</h3>
            <div className="filter-chip-row">
              {TEACHER_DIMENSIONS.map((option) => (
                <label key={option.key} className="filter-chip">
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(option.key)}
                    onChange={() => toggleDimension(option.key)}
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <h3>Refine Dataset</h3>
            <div className="filter-grid">
              <div>
                <label htmlFor="subjectFilter">Subject</label>
                <select id="subjectFilter" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                  <option value="all">All Subjects</option>
                  {subjectOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="classFilter">Class</label>
                <select id="classFilter" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                  <option value="all">All Classes</option>
                  {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="formFilter">Form</label>
                <select id="formFilter" value={formFilter} onChange={(e) => setFormFilter(e.target.value)}>
                  <option value="all">All Forms</option>
                  {formOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        {selectedDimensions.map((dimension) => {
          const groups = groupedBySelected[dimension] || [];
          const maxCount = groups.length > 0 ? Math.max(...groups.map((item) => item.count)) : 1;

          return (
            <section className="card" key={dimension}>
              <h3>{TEACHER_DIMENSIONS.find((item) => item.key === dimension)?.label} Analysis Chart</h3>

              {groups.length === 0 && <p>No analysis data for this group.</p>}

              {groups.length > 0 && (
                <div className="analysis-chart-block">
                  {groups.map((group) => {
                    const width = Math.max(6, Math.round((group.count / maxCount) * 100));
                    const positivePct = group.count ? Math.round((group.sentiment.positive / group.count) * 100) : 0;
                    const neutralPct = group.count ? Math.round((group.sentiment.neutral / group.count) * 100) : 0;
                    const negativePct = Math.max(0, 100 - positivePct - neutralPct);
                    return (
                      <button
                        type="button"
                        className="analysis-bar-row"
                        key={`${dimension}-${group.key}`}
                        onClick={() => setActiveGroup({ dimension, key: group.key, label: group.label })}
                      >
                        <div className="analysis-bar-meta">
                          <strong>{group.label}</strong>
                          <span>{group.count} feedback(s)</span>
                        </div>
                        <div className="analysis-bar-track">
                          <div className="analysis-bar-fill positive" style={{ width: `${Math.round((width * positivePct) / 100)}%` }} />
                          <div className="analysis-bar-fill neutral" style={{ width: `${Math.round((width * neutralPct) / 100)}%` }} />
                          <div className="analysis-bar-fill negative" style={{ width: `${Math.round((width * negativePct) / 100)}%` }} />
                        </div>
                        <div className="analysis-sentiment-row">
                          <span className="sentiment-pill positive">P {group.sentiment.positive}</span>
                          <span className="sentiment-pill neutral">N {group.sentiment.neutral}</span>
                          <span className="sentiment-pill negative">Neg {group.sentiment.negative}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {groups.map((group) => (
                <button
                  type="button"
                  className="list-row list-row-button"
                  key={`row-${dimension}-${group.key}`}
                  onClick={() => setActiveGroup({ dimension, key: group.key, label: group.label })}
                >
                  <strong>{group.label}</strong>
                  <span>{group.count} feedback(s)</span>
                </button>
              ))}
            </section>
          );
        })}

        <section className="card">
          <h3>Forms In Selected Group</h3>
          {!activeGroup && <p>Click any analysis group above to view all related forms.</p>}
          {activeGroup && (
            <>
              <p><strong>Selected:</strong> {activeGroup.label}</p>
              {activeGroupForms.length === 0 && <p>No forms found for this group.</p>}
              {activeGroupForms.map((form) => (
                <div className="list-row" key={form.id}>
                  <strong>{form.title}</strong>
                </div>
              ))}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
