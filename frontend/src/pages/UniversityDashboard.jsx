import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import StatusPopup from '../components/StatusPopup';
import FormTemplateSelector from '../components/FormTemplateSelector';
import SentimentCircleChart from '../components/SentimentCircleChart';
import api from '../services/api';

const initialFormState = {
  title: '',
  questions: [{ text: '', answerType: 'paragraph', ratingScale: { min: '1', max: '5' } }],
  assignedTeacher: '',
  subjectId: ''
};

function buildQuestionGroups(feedbacks) {
  const groups = new Map();

  for (const item of feedbacks) {
    const sentiment = item.sentiment === 'positive' || item.sentiment === 'negative' ? item.sentiment : 'neutral';
    for (const answer of item.answers || []) {
      const question = String(answer?.question || '').trim();
      if (!question) continue;

      const key = `${question}__${answer?.answerType || 'paragraph'}`;
      const existing = groups.get(key) || {
        key,
        question,
        answerType: answer?.answerType || 'paragraph',
        count: 0,
        sentiment: { positive: 0, neutral: 0, negative: 0 }
      };

      existing.count += 1;
      existing.sentiment[sentiment] += 1;
      groups.set(key, existing);
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.count - a.count || a.question.localeCompare(b.question));
}

export default function UniversityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [forms, setForms] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [manageFeedbackGroup, setManageFeedbackGroup] = useState('teacher');
  const [manageFeedbackSort, setManageFeedbackSort] = useState('count-desc');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('all');
  const [questionSort, setQuestionSort] = useState('count-desc');
  const [universityCode, setUniversityCode] = useState('');
  const [adminName, setAdminName] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [formState, setFormState] = useState(initialFormState);
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const [requestsRes, teachersRes, meRes, feedbackRes, formsRes, subjectsRes] = await Promise.all([
        api.get('/requests?scope=received&status=pending'),
        api.get('/auth/teachers'),
        api.get('/auth/me'),
        api.get('/feedback'),
        api.get('/form'),
        api.get('/subjects')
      ]);

      setRequests(requestsRes.data.requests || []);
      setTeachers(teachersRes.data.teachers || []);
      setUniversityCode(meRes.data?.user?.universityCode || 'Not available');
      setAdminName(meRes.data?.user?.name || '');
      setFeedbacks(feedbackRes.data.feedbacks || []);
      setForms(formsRes.data.forms || []);
      setSubjects(subjectsRes.data.subjects || []);
      setSelectedFeedbackIds([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const pendingTeacherRequests = useMemo(
    () => requests.filter((r) => r.type === 'teacher_to_university' && r.status === 'pending'),
    [requests]
  );

  const pendingSubjectRequests = useMemo(
    () => requests.filter((r) => r.type === 'teacher_to_subject' && r.status === 'pending'),
    [requests]
  );

  const complaintFeedbacks = useMemo(
    () => feedbacks.filter((item) => item.formId?.type === 'complaint'),
    [feedbacks]
  );

  const regularFeedbacks = useMemo(
    () => feedbacks.filter((item) => item.formId?.type !== 'complaint'),
    [feedbacks]
  );

  const suggestionFeedbacks = useMemo(
    () => feedbacks.filter((item) => Boolean(item.suggestion) || (Array.isArray(item.answers) && (item.answers || []).some(a => a?.answer && String(a.answer).trim().length > 0 && a?.question?.toLowerCase().includes('suggest')))),
    [feedbacks]
  );

  const questionGroups = useMemo(() => buildQuestionGroups(regularFeedbacks), [regularFeedbacks]);

  const manageFeedbackGroups = useMemo(() => {
    const groups = new Map();

    const getGroupMeta = (item) => {
      if (manageFeedbackGroup === 'subject') {
        return {
          key: String(item.subjectId?._id || item.formId?.subjectId?._id || item.formId?.subjectId || 'unassigned'),
          label: item.subjectId?.name || item.formId?.subjectId?.name || 'Unassigned Subject'
        };
      }

      if (manageFeedbackGroup === 'class') {
        return {
          key: item.className || 'Unassigned',
          label: item.className || 'Unassigned Class'
        };
      }

      if (manageFeedbackGroup === 'form') {
        return {
          key: String(item.formId?._id || 'unassigned-form'),
          label: item.formId?.title || 'Untitled Form'
        };
      }

      return {
        key: String(item.teacherId?._id || 'unassigned-teacher'),
        label: item.teacherId?.name || 'Unknown Teacher'
      };
    };

    for (const item of regularFeedbacks) {
      const meta = getGroupMeta(item);
      const existing = groups.get(meta.key) || { ...meta, items: [] };
      existing.items.push(item);
      groups.set(meta.key, existing);
    }

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [regularFeedbacks, manageFeedbackGroup]);

  const manageFeedbackChartGroups = useMemo(() => (
    manageFeedbackGroups.map((group) => {
      const sentiment = { positive: 0, neutral: 0, negative: 0 };

      for (const item of group.items) {
        const sentimentKey = item.sentiment === 'positive' || item.sentiment === 'negative' ? item.sentiment : 'neutral';
        sentiment[sentimentKey] += 1;
      }

      return {
        ...group,
        sentiment,
        count: group.items.length
      };
    }).sort((a, b) => {
      if (manageFeedbackSort === 'count-asc') return a.count - b.count || a.label.localeCompare(b.label);
      if (manageFeedbackSort === 'label-asc') return a.label.localeCompare(b.label);
      if (manageFeedbackSort === 'label-desc') return b.label.localeCompare(a.label);
      return b.count - a.count || a.label.localeCompare(b.label);
    })
  ), [manageFeedbackGroups, manageFeedbackSort]);

  const filteredQuestionGroups = useMemo(() => {
    const next = questionGroups.filter((group) => {
      if (questionTypeFilter === 'rating') return group.answerType === 'rating';
      if (questionTypeFilter === 'paragraph') return group.answerType !== 'rating';
      return true;
    });

    return next.sort((a, b) => {
      if (questionSort === 'count-asc') return a.count - b.count || a.question.localeCompare(b.question);
      if (questionSort === 'label-asc') return a.question.localeCompare(b.question);
      if (questionSort === 'label-desc') return b.question.localeCompare(a.question);
      if (questionSort === 'type') return a.answerType.localeCompare(b.answerType) || b.count - a.count || a.question.localeCompare(b.question);
      return b.count - a.count || a.question.localeCompare(b.question);
    });
  }, [questionGroups, questionTypeFilter, questionSort]);

  const questionAnalysisSummary = useMemo(() => {
    return filteredQuestionGroups.reduce((acc, group) => {
      acc.total += group.count;
      acc.positive += group.sentiment.positive;
      acc.neutral += group.sentiment.neutral;
      acc.negative += group.sentiment.negative;
      return acc;
    }, { total: 0, positive: 0, neutral: 0, negative: 0 });
  }, [filteredQuestionGroups]);

  const getFeedbackDetails = (item) => {
    const fields = [];

    if (manageFeedbackGroup !== 'teacher') {
      fields.push(item.teacherId?.name || 'Unknown teacher');
    }

    if (manageFeedbackGroup !== 'subject') {
      fields.push(item.subjectId?.name || item.formId?.subjectId?.name || 'No subject');
    }

    if (manageFeedbackGroup !== 'class') {
      fields.push(item.className || 'Unassigned class');
    }

    if (manageFeedbackGroup !== 'form') {
      fields.push(item.formId?.title || 'Untitled Form');
    }

    return fields.join(' | ');
  };

  const onAction = async (endpoint, requestId) => {
    setError('');

    try {
      await api.post(endpoint, { requestId });
      setPopup({ open: true, title: 'Request updated', message: 'The approval status has been saved.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Request action failed');
    }
  };

  const onCreateForm = async (e) => {
    e.preventDefault();
    setError('');

    const questions = (formState.questions || [])
      .map((q) => {
        const text = String(q?.text || '').trim();
        if (!text) return null;

        const answerType = q?.answerType === 'rating' ? 'rating' : 'paragraph';
        const question = { text, answerType };

        if (answerType === 'rating') {
          const min = Number.parseInt(q?.ratingScale?.min ?? '1', 10);
          const max = Number.parseInt(q?.ratingScale?.max ?? '5', 10);

          if (Number.isNaN(min) || Number.isNaN(max) || min < 1 || max < min || max > 10) {
            return null;
          }

          question.ratingScale = { min, max };
        }

        return question;
      })
      .filter(Boolean);

    if (questions.length === 0) {
      setError('At least one valid question is required');
      return;
    }

    try {
      await api.post('/form', {
        title: formState.title,
        type: 'public',
        questions,
        assignedTeacher: formState.assignedTeacher || undefined,
        subjectId: formState.subjectId || undefined
      });

      setPopup({ open: true, title: 'Form created', message: 'Your feedback form is now live.' });
      setFormState(initialFormState);
      setShowFormBuilder(false);
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Form creation failed');
    }
  };

  const createSubject = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/subjects', { name: subjectName });
      setPopup({ open: true, title: 'Subject created', message: 'The new subject is now available in the list.' });
      setSubjectName('');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create subject');
    }
  };

  const deleteForm = async (formId) => {
    setError('');

    try {
      await api.delete(`/form/${formId}`);
      setPopup({ open: true, title: 'Form deleted', message: 'The form has been removed from active use.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete form');
    }
  };

  const toggleFeedbackSelection = (feedbackId) => {
    setSelectedFeedbackIds((prev) => (
      prev.includes(feedbackId)
        ? prev.filter((id) => id !== feedbackId)
        : [...prev, feedbackId]
    ));
  };

  const deleteSingleFeedback = async (feedbackId) => {
    setError('');

    try {
      await api.delete(`/feedback/${feedbackId}`);
      setPopup({ open: true, title: 'Feedback deleted', message: 'The selected feedback has been deleted.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete feedback');
    }
  };

  const deleteMultipleFeedback = async () => {
    if (selectedFeedbackIds.length === 0) {
      setError('Select at least one feedback item to delete');
      return;
    }

    setError('');

    try {
      await api.delete('/feedback/bulk', { data: { feedbackIds: selectedFeedbackIds } });
      setPopup({ open: true, title: 'Feedback deleted', message: 'Selected feedback entries were deleted.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete selected feedback');
    }
  };

  return (
    <div className="page page-admin">
      <NavBar title="Admin Dashboard" userLabel={adminName || 'Admin'} />
      <StatusPopup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ open: false, title: '', message: '' })}
      />
      {showTemplateSelector && (
        <FormTemplateSelector
          onSelectTemplate={(template) => setFormState({
            title: template.title,
            questions: template.questions.map((q) => ({ ...q, ratingScale: q.ratingScale || { min: '1', max: '5' } })),
            assignedTeacher: formState.assignedTeacher || '',
            subjectId: formState.subjectId || ''
          })}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      <main className="content-grid single-column">
        {loading && <p>Loading dashboard...</p>}
        {error && <p className="error">{error}</p>}

        <section className="card">
          <div className="tabs-row">
            <button type="button" className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button type="button" className={`tab-btn ${activeTab === 'forms' ? 'active' : ''}`} onClick={() => setActiveTab('forms')}>Form Builder</button>
            <button type="button" className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>Manage Feedback{complaintFeedbacks.length > 0 && <span className="tab-badge">{complaintFeedbacks.length}</span>}</button>
            <button type="button" className={`tab-btn ${activeTab === 'feedback-charts' ? 'active' : ''}`} onClick={() => setActiveTab('feedback-charts')}>Grouped Analysis</button>
            <button type="button" className={`tab-btn ${activeTab === 'question-wise' ? 'active' : ''}`} onClick={() => setActiveTab('question-wise')}>Question Wise</button>
            <button type="button" className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`} onClick={() => setActiveTab('suggestions')}>Suggestions{suggestionFeedbacks.length > 0 && <span className="tab-badge tab-badge-suggest">{suggestionFeedbacks.length}</span>}</button>
          </div>
        </section>

        {activeTab === 'overview' && (
          <>
            <section className="card">
              <h2>University Code</h2>
              <p className="code">{universityCode || 'Loading...'}</p>
              <p>Share this code with teachers so they can send a join request.</p>
              <div style={{ marginTop: '0.75rem' }}>
                <Link className="btn" to="/admin/analysis">Open Analysis Page</Link>
              </div>
            </section>

            <section className="card">
              <h2>Subjects</h2>
              <p><strong>Total Subjects:</strong> {subjects.length}</p>
              <form className="stack" onSubmit={createSubject}>
                <label htmlFor="subjectName">New Subject</label>
                <input id="subjectName" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="e.g. Database Systems" required />
                <button className="btn" type="submit">Add Subject</button>
              </form>
            </section>

            <section className="card">
              <h2>Subject Requests</h2>
              {pendingSubjectRequests.length === 0 && <p>No subject requests pending.</p>}
              {pendingSubjectRequests.map((request) => (
                <div className="list-row" key={request._id}>
                  <div>
                    <strong>{request.senderId?.name}</strong>
                    <p>{request.subjectId?.name || 'Unknown subject'}</p>
                  </div>
                  <div className="row-actions">
                    <button className="btn" onClick={() => onAction('/approve', request._id)} type="button">Approve</button>
                    <button className="btn btn-danger" onClick={() => onAction('/reject', request._id)} type="button">Reject</button>
                  </div>
                </div>
              ))}
            </section>

            <section className="card">
              <h2>Teacher Requests</h2>
              {pendingTeacherRequests.length === 0 && <p>No pending teacher requests.</p>}
              {pendingTeacherRequests.map((request) => (
                <div className="list-row" key={request._id}>
                  <div>
                    <strong>{request.senderId?.name}</strong>
                    <p>{request.senderId?.email}</p>
                  </div>
                  <div className="row-actions">
                    <button className="btn" onClick={() => onAction('/approve', request._id)} type="button">Approve</button>
                    <button className="btn btn-danger" onClick={() => onAction('/reject', request._id)} type="button">Reject</button>
                  </div>
                </div>
              ))}
            </section>

            <section className="card">
              <h2>Complaints</h2>
              {complaintFeedbacks.length === 0 && <p>No complaints submitted yet.</p>}
              {complaintFeedbacks.length > 0 && (
                <div className="alert-banner">
                  <strong>Alert:</strong> There are {complaintFeedbacks.length} complaint(s). <button type="button" className="link-button" onClick={() => setActiveTab('feedback')}>Review now</button>
                </div>
              )}
              {complaintFeedbacks.map((item) => (
                <div key={item._id} className="list-row">
                  <div>
                    <strong>{item.teacherId?.name || 'Unknown Teacher'}</strong>
                    <p>Student: {item.studentId?.name || 'Anonymous'}</p>
                    <p>{item.complaintText || 'No complaint text provided'}</p>
                  </div>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </section>
          </>
        )}

        {activeTab === 'forms' && (
          <section className="card">
            <div className="section-header">
              <h2>Form Builder</h2>
              <button type="button" className="icon-btn" onClick={() => setShowFormBuilder((prev) => !prev)} aria-label="Create form" title="Create form">+</button>
            </div>

            {!showFormBuilder && <p>Click + to create a new feedback form.</p>}

            {showFormBuilder && (
              <>
                <div className="template-quick-select">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateSelector(true)}>Use a Template</button>
                </div>

                <form className="stack" onSubmit={onCreateForm}>
                  <label htmlFor="title">Form Title</label>
                  <input id="title" value={formState.title} onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))} placeholder="Untitled Form" required />

                  <div className="question-builder">
                    <h3>Questions</h3>
                    {formState.questions.map((question, index) => (
                      <div key={`question-${index}`} className="question-card">
                        <div className="question-card-header">
                          <strong>Question {index + 1}</strong>
                          {formState.questions.length > 1 && (
                            <button type="button" className="btn btn-danger" onClick={() => setFormState((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }))}>Remove</button>
                          )}
                        </div>
                        <input value={question?.text || ''} onChange={(e) => {
                          const value = e.target.value;
                          setFormState((prev) => {
                            const nextQuestions = [...prev.questions];
                            nextQuestions[index] = { ...nextQuestions[index], text: value };
                            return { ...prev, questions: nextQuestions };
                          });
                        }} placeholder="Type your question" required />
                        <div>
                          <label htmlFor={`answerType-${index}`}>Answer Format</label>
                          <select id={`answerType-${index}`} value={question?.answerType === 'rating' ? 'rating' : 'paragraph'} onChange={(e) => {
                            const value = e.target.value;
                            setFormState((prev) => {
                              const nextQuestions = [...prev.questions];
                              nextQuestions[index] = { ...nextQuestions[index], answerType: value === 'rating' ? 'rating' : 'paragraph' };
                              return { ...prev, questions: nextQuestions };
                            });
                          }}>
                            <option value="paragraph">Paragraph</option>
                            <option value="rating">Rating</option>
                          </select>
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary" onClick={() => setFormState((prev) => ({ ...prev, questions: [...prev.questions, { text: '', answerType: 'paragraph', ratingScale: { min: '1', max: '5' } }] }))}>+ Add Question</button>
                  </div>

                  <label htmlFor="assignedTeacher">Assign Teacher</label>
                  <select id="assignedTeacher" value={formState.assignedTeacher} onChange={(e) => setFormState((prev) => ({ ...prev, assignedTeacher: e.target.value }))}>
                    <option value="">Select teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>{teacher.name} ({teacher.teacherCode || 'pending code'})</option>
                    ))}
                  </select>

                  <label htmlFor="subjectId">Assign Subject</label>
                  <select id="subjectId" value={formState.subjectId} onChange={(e) => setFormState((prev) => ({ ...prev, subjectId: e.target.value }))}>
                    <option value="">Select subject</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>{subject.name} ({subject.code || 'no code'})</option>
                    ))}
                  </select>

                  <div className="row-actions">
                    <button className="btn" type="submit">Create Form</button>
                    <button className="btn btn-secondary" type="button" onClick={() => {
                      setShowFormBuilder(false);
                      setFormState(initialFormState);
                    }}>Cancel</button>
                  </div>
                </form>
              </>
            )}

            <h3>Created Forms</h3>
            {forms.length === 0 && <p>No forms created yet.</p>}
            {forms.map((form) => (
              <div key={form._id} className="list-row">
                <div>
                  <strong>{form.title}</strong>
                  <p>{(form.questions || []).length} question(s)</p>
                  <p>{form.subjectId?.name || 'No subject'}</p>
                </div>
                <div className="row-actions">
                  <span>{form.assignedTeacher?.name || form.subjectId?.name || 'Unassigned'}</span>
                  <button type="button" className="btn btn-danger" onClick={() => deleteForm(form._id)}>Delete</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'feedback' && (
          <section className="card">
            <div className="section-header">
              <h2>Delete Feedback (Single / Multiple)</h2>
              <button type="button" className="btn btn-danger" onClick={deleteMultipleFeedback}>Delete Selected ({selectedFeedbackIds.length})</button>
            </div>

            <div className="analysis-filters" style={{ marginBottom: '1rem' }}>
              <h3>Group Feedback By</h3>
              <div className="filter-grid">
                <div>
                  <label htmlFor="manageFeedbackGroup">Grouping</label>
                  <select
                    id="manageFeedbackGroup"
                    value={manageFeedbackGroup}
                    onChange={(e) => setManageFeedbackGroup(e.target.value)}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="subject">Subject</option>
                    <option value="class">Class</option>
                    <option value="form">Form</option>
                  </select>
                </div>
              </div>
            </div>

            {regularFeedbacks.length === 0 && <p>No regular feedback entries available.</p>}

            {manageFeedbackGroups.map((group) => (
              <div key={group.key} className="card" style={{ marginBottom: '0.75rem' }}>
                <h3>{group.label}</h3>
                {group.items.map((item) => (
                  <div key={item._id} className="list-row">
                    <div className="row-actions">
                      <input type="checkbox" checked={selectedFeedbackIds.includes(item._id)} onChange={() => toggleFeedbackSelection(item._id)} />
                      <div>
                        <strong>{item.formId?.title || 'Untitled Form'}</strong>
                        <p>{getFeedbackDetails(item)}</p>
                        <p>{item.className || 'Unassigned class'} | {item.sentiment || 'neutral'}</p>
                      </div>
                    </div>
                    <button type="button" className="btn btn-danger" onClick={() => deleteSingleFeedback(item._id)}>Delete</button>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {activeTab === 'feedback-charts' && (
          <section className="card">
            <div className="section-header">
              <h2>Overall Analysis</h2>
              <span className="info">Choose a grouping and sort order to update the charts</span>
            </div>

            <div className="stats-row analysis-summary-grid" style={{ marginBottom: '1rem' }}>
              <div className="card stat-card">
                <strong>{manageFeedbackChartGroups.reduce((sum, group) => sum + group.count, 0)}</strong>
                <span>feedbacks</span>
              </div>
              <div className="card stat-card">
                <strong>{manageFeedbackChartGroups.length}</strong>
                <span>groups</span>
              </div>
            </div>

            <div className="analysis-filters" style={{ marginBottom: '1rem' }}>
              <div className="filter-grid">
                <div>
                  <label htmlFor="manageFeedbackGroupChart">Grouping</label>
                  <select
                    id="manageFeedbackGroupChart"
                    value={manageFeedbackGroup}
                    onChange={(e) => setManageFeedbackGroup(e.target.value)}
                  >
                    <option value="teacher">Teacher</option>
                    <option value="subject">Subject</option>
                    <option value="class">Class</option>
                    <option value="form">Form</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="manageFeedbackSort">Sort By</label>
                  <select
                    id="manageFeedbackSort"
                    value={manageFeedbackSort}
                    onChange={(e) => setManageFeedbackSort(e.target.value)}
                  >
                    <option value="count-desc">Most feedback</option>
                    <option value="count-asc">Least feedback</option>
                    <option value="label-asc">Name A-Z</option>
                    <option value="label-desc">Name Z-A</option>
                  </select>
                </div>
              </div>
            </div>

            {manageFeedbackChartGroups.length === 0 && <p>No feedback available for charts.</p>}
            {manageFeedbackChartGroups.length > 0 && (
              <div className="circle-chart-grid">
                {manageFeedbackChartGroups.map((group) => (
                  <SentimentCircleChart
                    key={`manage-${manageFeedbackGroup}-${group.key}`}
                    title={group.label}
                    count={group.count}
                    sentiment={group.sentiment}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'question-wise' && (
          <section className="card">
            <div className="section-header">
              <h2>Question Wise Analysis</h2>
              <span className="info">Question type and overall analysis are shown for easy sorting</span>
            </div>

            <div className="stats-row analysis-summary-grid" style={{ marginBottom: '1rem' }}>
              <div className="card stat-card">
                <strong>{questionAnalysisSummary.total}</strong>
                <span>responses</span>
              </div>
              <div className="card stat-card">
                <strong>{questionAnalysisSummary.positive}</strong>
                <span>positive</span>
              </div>
              <div className="card stat-card">
                <strong>{questionAnalysisSummary.neutral}</strong>
                <span>neutral</span>
              </div>
              <div className="card stat-card">
                <strong>{questionAnalysisSummary.negative}</strong>
                <span>negative</span>
              </div>
            </div>

            <div className="analysis-filters" style={{ marginBottom: '1rem' }}>
              <div className="filter-grid">
                <div>
                  <label htmlFor="questionTypeFilter">Question Type</label>
                  <select
                    id="questionTypeFilter"
                    value={questionTypeFilter}
                    onChange={(e) => setQuestionTypeFilter(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="rating">Rating</option>
                    <option value="paragraph">Paragraph</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="questionSort">Sort By</label>
                  <select
                    id="questionSort"
                    value={questionSort}
                    onChange={(e) => setQuestionSort(e.target.value)}
                  >
                    <option value="count-desc">Most answered</option>
                    <option value="count-asc">Least answered</option>
                    <option value="label-asc">Question A-Z</option>
                    <option value="label-desc">Question Z-A</option>
                    <option value="type">Type</option>
                  </select>
                </div>
              </div>
            </div>

            {filteredQuestionGroups.length === 0 && <p>No question data available.</p>}
            {filteredQuestionGroups.length > 0 && (
              <div className="circle-chart-grid">
                {filteredQuestionGroups.map((group) => (
                  <SentimentCircleChart
                    key={group.key}
                    title={group.question}
                    subtitle={`Type: ${group.answerType === 'rating' ? 'Rating' : 'Paragraph'}`}
                    count={group.count}
                    sentiment={group.sentiment}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
