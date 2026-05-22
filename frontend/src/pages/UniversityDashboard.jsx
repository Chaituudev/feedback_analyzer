import React, { useEffect, useMemo, useState } from 'react';
import NavBar from '../components/NavBar';
import StatusPopup from '../components/StatusPopup';
import FormTemplateSelector from '../components/FormTemplateSelector';
import SentimentPieChart from '../components/SentimentPieChart';
import TrendLineChart from '../components/TrendLineChart';
import CategoryChart from '../components/CategoryChart';
import api from '../services/api';

const initialFormState = {
  title: '',
  questions: [{ text: '', answerType: 'paragraph', ratingScale: { min: '1', max: '5' } }],
  assignedTeacher: '',
  subjectId: ''
};

export default function UniversityDashboard() {
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [forms, setForms] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [teacherFeedback, setTeacherFeedback] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [universityCode, setUniversityCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [analytics, setAnalytics] = useState({
    sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
    categoryDistribution: { teaching: 0, infrastructure: 0, 'course content': 0, general: 0 },
    subjectDistribution: [],
    classDistribution: [],
    questionAnalysis: [],
    feedbackTrends: [],
    alertCount: 0,
    totalFeedback: 0
  });
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
      const [requestsRes, analyticsRes, teachersRes, meRes, feedbackRes, formsRes] = await Promise.all([
        api.get('/requests?scope=received&status=pending'),
        api.get('/feedback/analytics'),
        api.get('/auth/teachers'),
        api.get('/auth/me'),
        api.get('/feedback'),
        api.get('/form')
      ]);
      const subjectsRes = await api.get('/subjects');

      setRequests(requestsRes.data.requests || []);
      setAnalytics(analyticsRes.data);
      setTeachers(teachersRes.data.teachers || []);
      setUniversityCode(meRes.data?.user?.universityCode || 'Not available');
      setFeedbacks(feedbackRes.data.feedbacks || []);
      setForms(formsRes.data.forms || []);
      setSubjects(subjectsRes.data.subjects || []);
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

    let invalidRatingError = '';

    const questions = (formState.questions || [])
      .map((q) => {
        const text = String(q?.text || '').trim();
        const answerType = q?.answerType === 'rating' ? 'rating' : 'paragraph';
        if (!text) {
          return null;
        }

        const question = { text, answerType };

        if (answerType === 'rating') {
          const min = Number.parseInt(q?.ratingScale?.min ?? '1', 10);
          const max = Number.parseInt(q?.ratingScale?.max ?? '5', 10);

          if (Number.isNaN(min) || Number.isNaN(max) || min < 1 || max < min || max > 10) {
            invalidRatingError = 'Each rating question must have a valid rating range';
            return null;
          }

          question.ratingScale = { min, max };
        }

        return question;
      })
      .filter(Boolean);

    if (invalidRatingError) {
      setError(invalidRatingError);
      return;
    }

    if (questions.length === 0) {
      setError('At least one question is required');
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

  const setQuestion = (index, value) => {
    setFormState((prev) => {
      const nextQuestions = [...prev.questions];
      nextQuestions[index] = {
        ...nextQuestions[index],
        text: value
      };
      return { ...prev, questions: nextQuestions };
    });
  };

  const setQuestionAnswerType = (index, value) => {
    setFormState((prev) => {
      const nextQuestions = [...prev.questions];
      nextQuestions[index] = {
        ...nextQuestions[index],
        answerType: value === 'rating' ? 'rating' : 'paragraph',
        ratingScale: value === 'rating'
          ? (nextQuestions[index].ratingScale || { min: '1', max: '5' })
          : nextQuestions[index].ratingScale
      };
      return { ...prev, questions: nextQuestions };
    });
  };

  const addQuestion = () => {
    setFormState((prev) => ({
      ...prev,
      questions: [...prev.questions, { text: '', answerType: 'paragraph', ratingScale: { min: '1', max: '5' } }]
    }));
  };

  const removeQuestion = (index) => {
    setFormState((prev) => {
      const nextQuestions = prev.questions.filter((_, i) => i !== index);
      return {
        ...prev,
        questions: nextQuestions.length ? nextQuestions : [{ text: '', answerType: 'paragraph', ratingScale: { min: '1', max: '5' } }]
      };
    });
  };

  const handleSelectTemplate = (template) => {
    setFormState({
      title: template.title,
      questions: template.questions.map(q => ({
        ...q,
        ratingScale: q.ratingScale || { min: '1', max: '5' }
      })),
      assignedTeacher: formState.assignedTeacher || '',
      subjectId: formState.subjectId || ''
    });
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

  const loadTeacherFeedback = async (teacher) => {
    setError('');
    setSelectedTeacher(teacher);

    try {
      const { data } = await api.get(`/feedback?teacherId=${teacher._id}`);
      setTeacherFeedback(data.feedbacks || []);
    } catch (err) {
      setTeacherFeedback([]);
      setError(err.response?.data?.error || 'Failed to load teacher feedback');
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

  const ratingQuestions = useMemo(
    () => analytics.questionAnalysis?.filter((item) => item.answerType === 'rating') || [],
    [analytics.questionAnalysis]
  );

  const paragraphQuestions = useMemo(
    () => analytics.questionAnalysis?.filter((item) => item.answerType !== 'rating') || [],
    [analytics.questionAnalysis]
  );

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
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
      <main className="content-grid">
        {loading && <p>Loading dashboard...</p>}
        {error && <p className="error">{error}</p>}

        <section className="card">
          <h2>University Code</h2>
          <p className="code">{universityCode || 'Loading...'}</p>
          <p>Share this code with teachers so they can send a join request.</p>
        </section>

        <section className="card">
          <h2>Subjects</h2>
          <p><strong>Total Subjects:</strong> {subjects.length}</p>
          <form className="stack" onSubmit={createSubject}>
            <label htmlFor="subjectName">New Subject</label>
            <input
              id="subjectName"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Database Systems"
              required
            />
            <button className="btn" type="submit">Add Subject</button>
          </form>
          <div className="stack" style={{ marginTop: '1rem' }}>
            {subjects.length === 0 && <p>No subjects created yet.</p>}
            {subjects.map((subject) => (
              <div className="list-row" key={subject._id}>
                <div>
                  <strong>{subject.name}</strong>
                  <p>{subject.code || 'No code'}</p>
                </div>
                <span>{Array.isArray(subject.teachers) ? subject.teachers.length : 0} teacher(s)</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <h2>Form Builder</h2>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowFormBuilder((prev) => !prev)}
              aria-label="Create form"
              title="Create form"
            >
              +
            </button>
          </div>

          {!showFormBuilder && <p>Click + to create a new feedback form.</p>}

          {showFormBuilder && (
            <>
              <div className="template-quick-select">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTemplateSelector(true)}
                >
                  📋 Use a Template
                </button>
                <p>or fill the form manually below</p>
              </div>

              <form className="stack" onSubmit={onCreateForm}>
              <label htmlFor="title">Form Title</label>
              <input
                id="title"
                value={formState.title}
                onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Untitled Form"
                required
              />

              <div className="question-builder">
                <h3>Questions</h3>
                {formState.questions.map((question, index) => (
                  <div key={`question-${index}`} className="question-card">
                    <div className="question-card-header">
                      <strong>Question {index + 1}</strong>
                      {formState.questions.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => removeQuestion(index)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      value={question?.text || ''}
                      onChange={(e) => setQuestion(index, e.target.value)}
                      placeholder="Type your question"
                      required
                    />
                    <div>
                      <label htmlFor={`answerType-${index}`}>Answer Format</label>
                      <select
                        id={`answerType-${index}`}
                        value={question?.answerType === 'rating' ? 'rating' : 'paragraph'}
                        onChange={(e) => setQuestionAnswerType(index, e.target.value)}
                      >
                        <option value="paragraph">Paragraph</option>
                        <option value="rating">Rating</option>
                      </select>
                    </div>
                    {question?.answerType === 'rating' && (
                      <div className="range-row">
                        <div>
                          <label htmlFor={`ratingMin-${index}`}>Rating Min</label>
                          <input
                            id={`ratingMin-${index}`}
                            type="number"
                            min="1"
                            max="10"
                            value={question?.ratingScale?.min ?? '1'}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormState((prev) => {
                                const nextQuestions = [...prev.questions];
                                nextQuestions[index] = {
                                  ...nextQuestions[index],
                                  ratingScale: { ...(nextQuestions[index].ratingScale || { min: '1', max: '5' }), min: value }
                                };
                                return { ...prev, questions: nextQuestions };
                              });
                            }}
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor={`ratingMax-${index}`}>Rating Max</label>
                          <input
                            id={`ratingMax-${index}`}
                            type="number"
                            min="1"
                            max="10"
                            value={question?.ratingScale?.max ?? '5'}
                            onChange={(e) => {
                              const value = e.target.value;
                              setFormState((prev) => {
                                const nextQuestions = [...prev.questions];
                                nextQuestions[index] = {
                                  ...nextQuestions[index],
                                  ratingScale: { ...(nextQuestions[index].ratingScale || { min: '1', max: '5' }), max: value }
                                };
                                return { ...prev, questions: nextQuestions };
                              });
                            }}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-secondary" onClick={addQuestion}>
                  + Add Question
                </button>
              </div>

              <label htmlFor="assignedTeacher">Assign Teacher</label>
              <select
                id="assignedTeacher"
                value={formState.assignedTeacher}
                onChange={(e) => setFormState((prev) => ({ ...prev, assignedTeacher: e.target.value }))}
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.name} ({teacher.teacherCode || 'pending code'})
                  </option>
                ))}
              </select>

              <label htmlFor="subjectId">Assign Subject</label>
              <select
                id="subjectId"
                value={formState.subjectId}
                onChange={(e) => setFormState((prev) => ({ ...prev, subjectId: e.target.value }))}
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code || 'no code'})
                  </option>
                ))}
              </select>

              <div className="row-actions">
                <button className="btn" type="submit">Create Form</button>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => {
                    setShowFormBuilder(false);
                    setFormState(initialFormState);
                  }}
                >
                  Cancel
                </button>
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
                <button type="button" className="btn btn-danger" onClick={() => deleteForm(form._id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
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
                <button className="btn" onClick={() => onAction('/approve', request._id)} type="button">
                  Approve
                </button>
                <button className="btn btn-danger" onClick={() => onAction('/reject', request._id)} type="button">
                  Reject
                </button>
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
                <button className="btn" onClick={() => onAction('/approve', request._id)} type="button">
                  Approve
                </button>
                <button className="btn btn-danger" onClick={() => onAction('/reject', request._id)} type="button">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="card stats-row">
          <div>
            <h3>Total Feedback</h3>
            <p>{analytics.totalFeedback || 0}</p>
          </div>
          <div>
            <h3>Alerts</h3>
            <p>{analytics.alertCount || 0}</p>
          </div>
        </section>

        <SentimentPieChart distribution={analytics.sentimentDistribution} />
        <CategoryChart distribution={analytics.categoryDistribution} />
        <TrendLineChart trends={analytics.feedbackTrends} />

        <section className="card">
          <h2>Grouped Analysis</h2>
          <h3>By Subject</h3>
          {analytics.subjectDistribution?.length === 0 && <p>No subject data yet.</p>}
          {analytics.subjectDistribution?.map((item) => (
            <div className="list-row" key={`${item.subjectName}-${item.subjectCode}`}>
              <strong>{item.subjectName}</strong>
              <span>{item.count}</span>
            </div>
          ))}

          <h3>By Class</h3>
          {analytics.classDistribution?.length === 0 && <p>No class data yet.</p>}
          {analytics.classDistribution?.map((item) => (
            <div className="list-row" key={item.className}>
              <strong>{item.className}</strong>
              <span>{item.count}</span>
            </div>
          ))}

          <h3>By Question Type</h3>
          <h4>Rating Questions</h4>
          {ratingQuestions.length === 0 && <p>No rating question data yet.</p>}
          {ratingQuestions.map((item) => (
            <div className="list-row" key={`${item.question}-rating`}>
              <div>
                <strong>{item.question}</strong>
                <p>Type: {item.answerType}</p>
                <p>{item.responseCount} response(s)</p>
              </div>
              <span>{item.averageRating != null ? `Avg ${item.averageRating}` : 'No average'}</span>
            </div>
          ))}

          <h4>Text Questions</h4>
          {paragraphQuestions.length === 0 && <p>No text question data yet.</p>}
          {paragraphQuestions.map((item) => (
            <div className="list-row" key={`${item.question}-text`}>
              <div>
                <strong>{item.question}</strong>
                <p>Type: {item.answerType}</p>
                <p>{item.responseCount} response(s)</p>
              </div>
              <span>Text</span>
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
                <p>{item.category || 'general'} | {item.sentiment || 'neutral'}</p>
                <p>{item.suggestion || 'No suggestion generated'}</p>
              </div>
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Teacher Feedback Ratings</h2>
          {teachers.length === 0 && <p>No teachers assigned yet.</p>}
          {teachers.map((teacher) => (
            <div key={teacher._id} className="list-row">
              <button
                type="button"
                className="link-button"
                onClick={() => loadTeacherFeedback(teacher)}
              >
                {teacher.name}
              </button>
              <span>{teacher.teacherCode || 'No code'}</span>
            </div>
          ))}

          {selectedTeacher && (
            <div className="card" style={{ marginTop: '0.75rem' }}>
              <h3>Students and Ratings: {selectedTeacher.name}</h3>
              {teacherFeedback.filter((item) => item.formId?.type !== 'complaint').length === 0 && <p>No submissions for this teacher yet.</p>}
              {teacherFeedback
                .filter((item) => item.formId?.type !== 'complaint')
                .map((item) => (
                <div key={item._id} className="list-row">
                  <div>
                    <strong>{item.studentId?.name || 'Anonymous'}</strong>
                    <p>{item.formId?.title || 'Untitled Form'}</p>
                    <p>{item.subjectId?.name || item.formId?.subjectId?.name || 'No subject'}</p>
                    <p>{item.category || 'general'} | {item.sentiment || 'neutral'}</p>
                    <p>{item.suggestion || 'No suggestion generated'}</p>
                  </div>
                  <span>Rating: {item.rating || 'N/A'}</span>
                </div>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
