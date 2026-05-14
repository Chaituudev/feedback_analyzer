import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import StatusPopup from '../components/StatusPopup';
import api from '../services/api';

function normalizeQuestion(question, index) {
  if (typeof question === 'string') {
    const text = question.trim();
    return {
      text: text || `Question ${index + 1}`,
      answerType: 'paragraph'
    };
  }

  if (question && typeof question === 'object') {
    const textRaw = question.text ?? question.question ?? '';
    const text = String(textRaw).trim();
    const answerType = question.answerType === 'rating' || question.type === 'rating'
      ? 'rating'
      : 'paragraph';
    const ratingScale = question.ratingScale && typeof question.ratingScale === 'object'
      ? {
          min: Number.parseInt(question.ratingScale.min ?? 1, 10),
          max: Number.parseInt(question.ratingScale.max ?? 5, 10)
        }
      : null;

    return {
      text: text || `Question ${index + 1}`,
      answerType,
      ratingScale: answerType === 'rating' && ratingScale ? ratingScale : null
    };
  }

  return {
    text: `Question ${index + 1}`,
    answerType: 'paragraph',
    ratingScale: null
  };
}

export default function FeedbackFormPage() {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState({ open: false, title: '', message: '' });

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/form/${formId}`);
        setForm(data.form);
        const normalizedQuestions = (data.form.questions || []).map((question, index) => normalizeQuestion(question, index));
        setAnswers(
          normalizedQuestions.map((question) => {
            if (question.answerType === 'rating') {
              return String(question.ratingScale?.max ?? 5);
            }

            return '';
          })
        );
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load form');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [formId]);

  const setAnswer = (index, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        formId,
        answers: (form.questions || []).map((question, index) => {
          const normalizedQuestion = normalizeQuestion(question, index);
          return {
            question: normalizedQuestion.text,
            answer: answers[index] || ''
          };
        })
      };

      await api.post('/feedback', payload);
      setPopup({ open: true, title: 'Feedback submitted', message: 'Your response has been saved successfully.' });
      setTimeout(() => navigate('/student'), 900);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <NavBar title="Submit Feedback" />
      <StatusPopup
        open={popup.open}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ open: false, title: '', message: '' })}
      />
      <main className="content-grid single-column">
        {loading && <p>Loading form...</p>}
        {error && <p className="error">{error}</p>}

        {form && (
          <section className="card">
            <h2>{form.title}</h2>
            <p>Type: {form.type}</p>

            <form className="stack" onSubmit={submit}>
              {(form.questions || []).map((question, index) => {
                const normalizedQuestion = normalizeQuestion(question, index);
                const ratingMin = normalizedQuestion.ratingScale?.min ?? 1;
                const ratingMax = normalizedQuestion.ratingScale?.max ?? 5;
                const ratingOptions = Array.from(
                  { length: Math.max(0, ratingMax - ratingMin + 1) },
                  (_, valueIndex) => ratingMin + valueIndex
                );

                return (
                  <div key={`${normalizedQuestion.text}-${index}`}>
                    <label htmlFor={`q-${index}`}>{normalizedQuestion.text}</label>
                    {normalizedQuestion.answerType === 'rating' ? (
                      <select
                        id={`q-${index}`}
                        value={answers[index] || String(ratingMax)}
                        onChange={(e) => setAnswer(index, e.target.value)}
                        required
                      >
                        {ratingOptions.map((value) => (
                          <option key={`q-${index}-rating-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        id={`q-${index}`}
                        rows="3"
                        value={answers[index] || ''}
                        onChange={(e) => setAnswer(index, e.target.value)}
                        required
                      />
                    )}
                  </div>
                );
              })}

              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
