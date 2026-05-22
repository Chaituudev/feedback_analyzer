import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import api from '../services/api';

const ALL_DIMENSIONS = [
  { key: 'teacher', label: 'Teacher' },
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
  if (dimension === 'teacher') return item.teacherId?.name || 'Unknown Teacher';
  if (dimension === 'subject') return item.subjectId?.name || item.formId?.subjectId?.name || 'Unassigned Subject';
  if (dimension === 'class') return item.className || 'Unassigned Class';
  if (dimension === 'form') return item.formId?.title || 'Untitled Form';
  return 'Unknown';
}

function toDimensionKey(item, dimension) {
  if (dimension === 'teacher') return toId(item.teacherId) || 'none-teacher';
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

export default function AdminAnalysisPage() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedDimensions, setSelectedDimensions] = useState(['teacher', 'subject']);
  const [teacherFilter, setTeacherFilter] = useState('all');
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
        setFeedbacks(data.feedbacks || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load analysis');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const teacherOptions = useMemo(() => uniqueOptions(feedbacks, 'teacher'), [feedbacks]);
  const subjectOptions = useMemo(() => uniqueOptions(feedbacks, 'subject'), [feedbacks]);
  const classOptions = useMemo(() => uniqueOptions(feedbacks, 'class'), [feedbacks]);
  const formOptions = useMemo(() => uniqueOptions(feedbacks, 'form'), [feedbacks]);

  const filteredFeedbacks = useMemo(() => feedbacks.filter((item) => {
    const teacherKey = toDimensionKey(item, 'teacher');
    const subjectKey = toDimensionKey(item, 'subject');
    const classKey = toDimensionKey(item, 'class');
    const formKey = toDimensionKey(item, 'form');

    return (teacherFilter === 'all' || teacherFilter === teacherKey)
      && (subjectFilter === 'all' || subjectFilter === subjectKey)
      && (classFilter === 'all' || classFilter === classKey)
      && (formFilter === 'all' || formFilter === formKey);
  }), [feedbacks, teacherFilter, subjectFilter, classFilter, formFilter]);

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
          forms: new Map()
        };

        existing.count += 1;

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
    <div className="page page-admin">
      <NavBar title="Admin Dashboard" />
      <main className="content-grid single-column">
        <section className="card">
          <div className="row-actions" style={{ justifyContent: 'space-between' }}>
            <h2>Filtered Analysis</h2>
            <Link className="btn btn-secondary" to="/admin">Back to Dashboard</Link>
          </div>
          {loading && <p>Loading analysis...</p>}
          {error && <p className="error">{error}</p>}

          <div className="analysis-filters">
            <h3>Group By</h3>
            <div className="filter-chip-row">
              {ALL_DIMENSIONS.map((option) => (
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
                <label htmlFor="teacherFilter">Teacher</label>
                <select id="teacherFilter" value={teacherFilter} onChange={(e) => setTeacherFilter(e.target.value)}>
                  <option value="all">All Teachers</option>
                  {teacherOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
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

        {selectedDimensions.map((dimension) => (
          <section className="card" key={dimension}>
            <h3>{ALL_DIMENSIONS.find((item) => item.key === dimension)?.label} Analysis</h3>
            {(groupedBySelected[dimension] || []).length === 0 && <p>No analysis data for this group.</p>}
            {(groupedBySelected[dimension] || []).map((group) => (
              <button
                type="button"
                className="list-row list-row-button"
                key={`${dimension}-${group.key}`}
                onClick={() => setActiveGroup({ dimension, key: group.key, label: group.label })}
              >
                <strong>{group.label}</strong>
                <span>{group.count} feedback(s)</span>
              </button>
            ))}
          </section>
        ))}

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
