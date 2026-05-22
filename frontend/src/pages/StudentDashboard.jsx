import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import StatusPopup from '../components/StatusPopup';
import api from '../services/api';

export default function StudentDashboard() {
  const [forms, setForms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [me, setMe] = useState(null);
  const [className, setClassName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [complaint, setComplaint] = useState('');
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setError('');

    try {
      const [formsRes, requestsRes, feedbackRes] = await Promise.all([
        api.get('/form'),
        api.get('/requests?scope=sent'),
        api.get('/feedback')
      ]);
      const meRes = await api.get('/auth/me');

      setForms(formsRes.data.forms || []);
      setRequests(requestsRes.data.requests || []);
      setFeedbacks(feedbackRes.data.feedbacks || []);
      setMe(meRes.data.user || null);
      setClassName(meRes.data.user?.className || '');
      setSubjectId(meRes.data.user?.subjectId?._id || meRes.data.user?.subjectId || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.patch('/auth/me', { className, subjectId });
      setPopup({ open: true, title: 'Class updated', message: 'Your class has been saved for grouped analysis.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update class');
    }
  };

  const sendTeacherRequest = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/request/teacher', { teacherCode });
      setPopup({ open: true, title: 'Request sent', message: 'Your teacher request was submitted successfully.' });
      setTeacherCode('');
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    }
  };

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.type === 'student_to_teacher'),
    [requests]
  );

  const complaintHistory = useMemo(
    () => feedbacks.filter((item) => item.formId?.type === 'complaint'),
    [feedbacks]
  );

  const submittedFormIds = useMemo(
    () => new Set(feedbacks.filter((item) => item.formId?.type !== 'complaint').map((item) => item.formId?._id).filter(Boolean)),
    [feedbacks]
  );

  const availableForms = useMemo(
    () => forms.filter((form) => !submittedFormIds.has(form._id)),
    [forms, submittedFormIds]
  );

  const availableSubjects = useMemo(
    () => (Array.isArray(me?.teacherId?.subjects) ? me.teacherId.subjects : []),
    [me]
  );

  const submitComplaint = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittingComplaint(true);

    try {
      await api.post('/feedback/complaint', { complaint });
      setComplaint('');
      setShowComplaintForm(false);
      setPopup({ open: true, title: 'Complaint submitted', message: 'Your complaint has been recorded.' });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Complaint submission failed');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  return (
    <div className="page page-student">
      <NavBar title="Student Dashboard" />
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
          <h2>Your Profile</h2>
          <p><strong>Class:</strong> {me?.className || 'Not set'}</p>
          <form className="stack" onSubmit={saveProfile}>
            <label htmlFor="className">Class Name</label>
            <input
              id="className"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g. BCA 2nd Year A"
              required
            />
            <label htmlFor="subjectId">Subject</label>
            <select id="subjectId" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Select your subject</option>
              {availableSubjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name} ({subject.code || 'no code'})
                </option>
              ))}
            </select>
            {availableSubjects.length === 0 && <p>No subjects are assigned to your teacher yet.</p>}
            <button className="btn" type="submit">Save Profile</button>
          </form>
        </section>

        <section className="card">
          <h2>Send Teacher Request</h2>
          <form className="stack" onSubmit={sendTeacherRequest}>
            <label htmlFor="teacherCode">Teacher Code</label>
            <input
              id="teacherCode"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="TCH-XXXXXX"
              required
            />
            <button className="btn" type="submit">Send Request</button>
          </form>
        </section>

        <section className="card">
          <h2>Your Request Status</h2>
          {pendingRequests.length === 0 && <p>No requests submitted yet.</p>}
          {pendingRequests.map((request) => (
            <div className="list-row" key={request._id}>
              <div>
                <strong>{request.receiverId?.name}</strong>
                <p>{request.receiverId?.email}</p>
              </div>
              <span className={`status status-${request.status}`}>{request.status}</span>
            </div>
          ))}
        </section>

        <section className="card">
          <h2>Available Forms</h2>
          {availableForms.length === 0 && <p>No new forms available right now.</p>}
          {availableForms.map((form) => (
            <div className="list-row" key={form._id}>
              <div>
                <strong>{form.title}</strong>
                <p>Type: {form.type}</p>
                <p>{form.subjectId?.name || 'No subject'}</p>
              </div>
              <Link className="btn" to={`/forms/${form._id}`}>
                Fill Form
              </Link>
            </div>
          ))}
        </section>

        <section className="card">
          <div className="section-header">
            <h2>Complaints</h2>
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowComplaintForm((prev) => !prev)}
              aria-label="Add complaint"
              title="Add complaint"
            >
              +
            </button>
          </div>

          {showComplaintForm && (
            <form className="stack" onSubmit={submitComplaint}>
              <label htmlFor="complaint">What is your complaint?</label>
              <textarea
                id="complaint"
                rows="4"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                required
              />
              <button className="btn" type="submit" disabled={submittingComplaint}>
                {submittingComplaint ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </form>
          )}

          <h3>Submitted Complaints</h3>
          {complaintHistory.length === 0 && <p>No complaints submitted yet.</p>}
          {complaintHistory.map((item) => {
            const complaintText = (item.answers || []).find((ans) => ans?.answer)?.answer || item.rawText || '-';

            return (
              <div className="list-row" key={item._id}>
                <div>
                  <strong>{item.formId?.title || 'Complaint'}</strong>
                  <p>{complaintText}</p>
                </div>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
