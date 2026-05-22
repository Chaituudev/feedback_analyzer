import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import StatusPopup from '../components/StatusPopup';
import FormTemplateSelector from '../components/FormTemplateSelector';
import api from '../services/api';

const initialFormState = {
  title: '',
  questions: [{ text: '', answerType: 'paragraph', ratingScale: { min: '1', max: '5' } }],
  assignedTeacher: '',
  subjectId: ''
};

export default function UniversityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [forms, setForms] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [universityCode, setUniversityCode] = useState('');
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
      <NavBar title="Admin Dashboard" />
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
            <button type="button" className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>Manage Feedback</button>
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

            {regularFeedbacks.length === 0 && <p>No regular feedback entries available.</p>}
            {regularFeedbacks.map((item) => (
              <div key={item._id} className="list-row">
                <div className="row-actions">
                  <input type="checkbox" checked={selectedFeedbackIds.includes(item._id)} onChange={() => toggleFeedbackSelection(item._id)} />
                  <div>
                    <strong>{item.formId?.title || 'Untitled Form'}</strong>
                    <p>{item.teacherId?.name || 'Unknown teacher'} | {item.subjectId?.name || item.formId?.subjectId?.name || 'No subject'}</p>
                    <p>{item.className || 'Unassigned class'} | {item.sentiment || 'neutral'}</p>
                  </div>
                </div>
                <button type="button" className="btn btn-danger" onClick={() => deleteSingleFeedback(item._id)}>Delete</button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
