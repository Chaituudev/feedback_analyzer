import React, { useEffect, useMemo, useState } from 'react';
import NavBar from '../components/NavBar';
import StatusPopup from '../components/StatusPopup';
import SentimentPieChart from '../components/SentimentPieChart';
import TrendLineChart from '../components/TrendLineChart';
import api from '../services/api';

export default function TeacherDashboard() {
  const [requests, setRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [me, setMe] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [analytics, setAnalytics] = useState({
    sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
    feedbackTrends: [],
    alertCount: 0,
    totalFeedback: 0,
    negativePercentage: 0,
    exceedsNegativeThreshold: false
  });
  const [alerts, setAlerts] = useState([]);
  const [teacherCode, setTeacherCode] = useState('');
  const [universityCode, setUniversityCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isUniversityAssigned, setIsUniversityAssigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const [requestsRes, sentRes, feedbackRes, analyticsRes, alertsRes, subjectsRes, meRes] = await Promise.all([
        api.get('/requests?scope=received&status=pending'),
        api.get('/requests?scope=sent'),
        api.get('/feedback'),
        api.get('/feedback/analytics'),
        api.get('/feedback?alertOnly=true'),
        api.get('/subjects'),
        api.get('/auth/me')
      ]);

      setRequests(requestsRes.data.requests || []);
      setSentRequests(sentRes.data.requests || []);
      setFeedbacks(feedbackRes.data.feedbacks || []);
      setAnalytics(analyticsRes.data);
      setAlerts(alertsRes.data.feedbacks || []);
      setSubjects(subjectsRes.data.subjects || []);
      setMe(meRes.data.user || null);
      setTeacherCode(meRes.data.user?.teacherCode || 'Pending approval');
      setIsUniversityAssigned(Boolean(meRes.data.user?.universityId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const pendingStudentRequests = useMemo(
    () => requests.filter((r) => r.type === 'student_to_teacher' && r.status === 'pending'),
    [requests]
  );

  const onAction = async (endpoint, requestId) => {
    setError('');
    try {
      await api.post(endpoint, { requestId });
      setPopup({ open: true, title: 'Request updated', message: 'The request decision has been saved.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Request action failed');
    }
  };

  const submitUniversityRequest = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/request/university', { universityCode });
      setUniversityCode('');
      setPopup({ open: true, title: 'Request sent', message: 'Your university request is now pending approval.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send university request');
    }
  };

  const submitSubjectRequest = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/request/subject', { subjectId });
      setSubjectId('');
      setPopup({ open: true, title: 'Subject request sent', message: 'Your subject request is pending approval.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send subject request');
    }
  };

  const leaveUniversity = async () => {
    setError('');

    try {
      await api.post('/leave-university');
      setPopup({ open: true, title: 'Left university', message: 'You are no longer assigned to the university.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave university');
    }
  };

  const teacherUniversityRequests = sentRequests.filter((r) => r.type === 'teacher_to_university');
  const teacherSubjectRequests = sentRequests.filter((r) => r.type === 'teacher_to_subject');
  const complaintFeedbacks = feedbacks.filter((item) => item.formId?.type === 'complaint');
  const regularFeedbacks = feedbacks.filter((item) => item.formId?.type !== 'complaint');
  const assignedSubjects = Array.isArray(me?.subjects) ? me.subjects : [];

  return (
    <div className="page">
      <NavBar title="Teacher Dashboard" />
      <StatusPopup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ open: false, title: '', message: '' })}
      />
      <main className="content-grid">
        {loading && <p>Loading dashboard...</p>}
        {error && <p className="error">{error}</p>}

        <section className="card">
          <h2>Teacher Code</h2>
          <p className="code">{teacherCode}</p>
          <p>Share this code with students so they can send requests.</p>
        </section>

        <section className="card">
          <h2>Assigned Subjects</h2>
          {assignedSubjects.length === 0 && <p>No subjects assigned yet.</p>}
          {assignedSubjects.map((subject) => (
            <div className="list-row" key={subject._id || subject.code}>
              <div>
                <strong>{subject.name}</strong>
                <p>{subject.code || 'No code'}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Request University Approval</h2>
          {isUniversityAssigned ? (
            <div className="stack">
              <p>You are already assigned to a university.</p>
              <button className="btn btn-danger" onClick={leaveUniversity} type="button">
                Leave University
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={submitUniversityRequest}>
              <label htmlFor="universityCode">University Code</label>
              <input
                id="universityCode"
                value={universityCode}
                onChange={(e) => setUniversityCode(e.target.value)}
                placeholder="UNI-XXXXXX"
                required
              />
              <button className="btn" type="submit">Send Request</button>
            </form>
          )}

          <h3>Request Subject Access</h3>
          {isUniversityAssigned ? (
            <form className="stack" onSubmit={submitSubjectRequest}>
              <label htmlFor="subjectId">Subject</label>
              <select
                id="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              >
                <option value="">Select subject</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code || 'no code'})
                  </option>
                ))}
              </select>
              <button className="btn" type="submit">Request Subject</button>
            </form>
          ) : (
            <p>Join a university before requesting subjects.</p>
          )}

          <h3>Approval Status</h3>
          {teacherUniversityRequests.length === 0 && <p>No university requests submitted.</p>}
          {teacherUniversityRequests.map((request) => (
            <div className="list-row" key={request._id}>
              <div>
                <strong>{request.receiverId?.name || 'University'}</strong>
                <p>{request.receiverId?.universityCode || '-'}</p>
              </div>
              <span className={`status status-${request.status}`}>{request.status}</span>
            </div>
          ))}

          <h3>Subject Requests</h3>
          {teacherSubjectRequests.length === 0 && <p>No subject requests submitted.</p>}
          {teacherSubjectRequests.map((request) => (
            <div className="list-row" key={request._id}>
              <div>
                <strong>{request.subjectId?.name || 'Subject'}</strong>
                <p>{request.subjectId?.code || '-'}</p>
              </div>
              <span className={`status status-${request.status}`}>{request.status}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Student Requests</h2>
          {pendingStudentRequests.length === 0 && <p>No pending student requests.</p>}
          {pendingStudentRequests.map((request) => (
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
        <TrendLineChart trends={analytics.feedbackTrends} />

        {analytics.exceedsNegativeThreshold && (
          <section className="card alert-warning">
            <h2>⚠️ High Negative Feedback Alert</h2>
            <p className="alert-percentage">{analytics.negativePercentage}% Negative Feedback</p>
            <p className="alert-message">Warning: exceeds 30% threshold</p>
          </section>
        )}

        <section className="card">
          <h2>Student Form Submissions</h2>
          {regularFeedbacks.length === 0 && <p>No student submissions yet.</p>}
          {regularFeedbacks.map((item) => {
            const studentName = item.studentId?.name || 'Anonymous';
            return (
              <div key={item._id} className="list-row">
                <div>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setSelectedFeedback(item)}
                  >
                    {studentName}
                  </button>
                  <p>{item.formId?.title || 'Untitled Form'} | Rating: {item.rating || 'N/A'}</p>
                  <p>{item.subjectId?.name || item.formId?.subjectId?.name || 'No subject'} | Class: {item.className || 'Unassigned'}</p>
                  <p>{item.category || 'general'} | {item.sentiment || 'neutral'}</p>
                </div>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}

          {selectedFeedback && (
            <div className="card" style={{ marginTop: '0.75rem' }}>
              <h3>Submitted Form Details</h3>
              <p>
                <strong>Student:</strong> {selectedFeedback.studentId?.name || 'Anonymous'}
              </p>
              <p>
                <strong>Form:</strong> {selectedFeedback.formId?.title || 'Untitled Form'}
              </p>
              <p>
                <strong>Subject:</strong> {selectedFeedback.subjectId?.name || selectedFeedback.formId?.subjectId?.name || 'No subject'}
              </p>
              <p>
                <strong>Class:</strong> {selectedFeedback.className || 'Unassigned'}
              </p>
              <p>
                <strong>Rating:</strong> {selectedFeedback.rating || 'N/A'}
              </p>
              <p>
                <strong>Sentiment:</strong> {selectedFeedback.sentiment || 'neutral'}
              </p>
              <p>
                <strong>Category:</strong> {selectedFeedback.category || 'general'}
              </p>
              <p>
                <strong>Suggestion:</strong> {selectedFeedback.suggestion || 'No suggestion generated'}
              </p>
              <div className="stack">
                {(selectedFeedback.answers || []).map((ans, idx) => (
                  <div key={`${idx}-${ans.question || 'q'}`}>
                    <p><strong>{ans.question || `Question ${idx + 1}`}</strong></p>
                    <p>{ans.answer || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Complaints</h2>
          {complaintFeedbacks.length === 0 && <p>No complaints submitted yet.</p>}
          {complaintFeedbacks.map((item) => {
            const complaintText = (item.answers || []).find((ans) => ans?.answer)?.answer || item.rawText || '-';
            return (
              <div key={item._id} className="list-row">
                <div>
                  <strong>{item.studentId?.name || 'Anonymous Student'}</strong>
                  <p>{complaintText}</p>
                  <p>{item.subjectId?.name || item.formId?.subjectId?.name || 'No subject'} | Class: {item.className || 'Unassigned'}</p>
                  <p>{item.category || 'general'} | {item.sentiment || 'neutral'}</p>
                  <p>{item.suggestion || 'No suggestion generated'}</p>
                </div>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}
        </section>

        <section className="card">
          <h2>Alert Feedback</h2>
          {alerts.length === 0 && <p>No alerts.</p>}
          {alerts.map((item) => (
            <div key={item._id} className="list-row">
              <div>
                <strong>{item.formId?.title || 'Untitled Form'}</strong>
                <p>{item.category} | {item.sentiment}</p>
                <p>{item.subjectId?.name || item.formId?.subjectId?.name || 'No subject'} | Class: {item.className || 'Unassigned'}</p>
                <p>{item.suggestion || 'No suggestion generated'}</p>
                {Array.isArray(item.alertReasons) && item.alertReasons.length > 0 && (
                  <p>{item.alertReasons.join(' | ')}</p>
                )}
              </div>
              <p>{item.rawText}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
