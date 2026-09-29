import React, { useState } from 'react';
import { Brain, Sparkles, Check, X, Trophy, RotateCcw, Loader } from 'lucide-react';
import api from '../lib/api';
import { QuizQuestion } from '../types';
import toast from 'react-hot-toast';
import { storage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

interface QuizState {
  questions: QuizQuestion[];
  answers: Record<number, string>;
  submitted: boolean;
  score: number;
  quizId?: string;
}

const QuizGenerator: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({ topic: '', numQuestions: '5', difficulty: 'medium' });
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.topic) { toast.error('Please enter a topic'); return; }
    if (!storage.isOnline()) {
      toast.error('AI Quiz Generation requires an internet connection.', {
        icon: '📡',
      });
      return;
    }
    setGenerating(true);
    setQuiz(null);
    setCurrentQ(0);
    try {
      const res = await api.post('/api/ai/quiz', {
        topic: form.topic,
        numQuestions: parseInt(form.numQuestions),
        difficulty: form.difficulty,
      });
      const questions = res.data?.questions;
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No quiz questions were generated for this topic. Please try again.');
      }

      // 1. Immediately save quiz to local device storage (0ms)
      const savedQuiz = storage.saveQuiz({
        topic: form.topic,
        difficulty: form.difficulty as any,
        questions,
        total_questions: questions.length,
      }, user?.id);

      setQuiz({ questions, answers: {}, submitted: false, score: 0, quizId: savedQuiz.id });
      toast.success('Quiz ready! Answer the questions below.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnswer = (questionId: number, answer: string) => {
    if (quiz?.submitted) return;
    setQuiz(prev => prev ? { ...prev, answers: { ...prev.answers, [questionId]: answer } } : null);
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const unanswered = quiz.questions.filter(q => !quiz.answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions (${unanswered.length} remaining)`);
      return;
    }
    const score = quiz.questions.reduce((sum, q) => {
      const userAns = String(quiz.answers[q.id] || '').trim().toUpperCase();
      const correctAns = String(q.correctAnswer || '').trim().toUpperCase();
      return sum + (userAns === correctAns ? 1 : 0);
    }, 0);
    
    // Save score to local storage immediately
    if (quiz.quizId) {
      storage.updateQuizScore(quiz.quizId, score, user?.id);
    }
    setQuiz(prev => prev ? { ...prev, submitted: true, score } : null);
    setCurrentQ(0);
  };

  const resetQuiz = () => {
    setQuiz(null);
    setForm({ topic: '', numQuestions: '5', difficulty: 'medium' });
  };

  const percentage = quiz ? Math.round((quiz.score / quiz.questions.length) * 100) : 0;
  const getScoreColor = (pct: number) => pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
  const getScoreMsg = (pct: number) => pct >= 90 ? 'Excellent! 🎉' : pct >= 70 ? 'Good job! 👍' : pct >= 50 ? 'Keep practicing 📚' : 'Need more review 💪';

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Quiz results view
  if (quiz?.submitted) {
    return (
      <div className="fade-up">
        <div className="page-header">
          <h1 className="page-title">Quiz Results</h1>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {/* Score card */}
          <div className="card" style={{ textAlign: 'center', marginBottom: 'var(--space-5)', background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${getScoreColor(percentage)}20`, border: `3px solid ${getScoreColor(percentage)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Trophy size={32} style={{ color: getScoreColor(percentage) }} />
            </div>
            <h2 style={{ fontSize: 48, fontWeight: 900, color: getScoreColor(percentage), marginBottom: 4 }}>{percentage}%</h2>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{getScoreMsg(percentage)}</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              You got <strong style={{ color: 'var(--text-primary)' }}>{quiz.score}</strong> out of <strong style={{ color: 'var(--text-primary)' }}>{quiz.questions.length}</strong> questions correct
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-5)' }}>
              <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--success-light)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{quiz.score}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Correct</p>
              </div>
              <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger)' }}>{quiz.questions.length - quiz.score}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Incorrect</p>
              </div>
            </div>
          </div>

          {/* Question review */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {quiz.questions.map((q, idx) => {
              const userAnswer = String(quiz.answers[q.id] || '').trim().toUpperCase();
              const correctAns = String(q.correctAnswer || '').trim().toUpperCase();
              const isCorrect = userAnswer === correctAns;
              return (
                <div key={q.id} className="card">
                  <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: isCorrect ? 'var(--success-light)' : 'var(--danger-light)', color: isCorrect ? 'var(--success)' : 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>
                      {isCorrect ? <Check size={14} /> : <X size={14} />}
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Q{idx + 1}. {q.question}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {q.options.map(opt => {
                      const letter = opt.charAt(0).toUpperCase();
                      const isCorrectOpt = letter === correctAns;
                      const isUserOpt = letter === userAnswer;
                      let className = 'quiz-option';
                      if (isCorrectOpt) className += ' quiz-option--correct';
                      else if (isUserOpt && !isCorrect) className += ' quiz-option--wrong';
                      return (
                        <div key={opt} className={className}>
                          {isCorrectOpt ? <Check size={14} /> : isUserOpt ? <X size={14} /> : <div style={{ width: 14 }} />}
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--info)' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}><strong style={{ color: 'var(--info)' }}>Explanation:</strong> {q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={resetQuiz}><RotateCcw size={15} /> Try New Quiz</button>
          </div>
        </div>
      </div>
    );
  }

  // Active quiz view
  if (quiz && !quiz.submitted) {
    const q = quiz.questions[currentQ];
    const answered = Object.keys(quiz.answers).length;
    const progress = (answered / quiz.questions.length) * 100;

    return (
      <div className="fade-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Quiz: {form.topic}</h1>
            <p className="page-subtitle">{answered} of {quiz.questions.length} answered · {form.difficulty} difficulty</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={resetQuiz}>Exit Quiz</button>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Progress bar */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div className="progress-bar-container" style={{ height: 6 }}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Question navigation */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
            {quiz.questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${i === currentQ ? 'var(--accent)' : quiz.answers[quiz.questions[i].id] ? 'var(--success)' : 'var(--border-default)'}`,
                  background: i === currentQ ? 'var(--accent)' : quiz.answers[quiz.questions[i].id] ? 'var(--success-light)' : 'var(--bg-elevated)',
                  color: i === currentQ ? '#fff' : quiz.answers[quiz.questions[i].id] ? 'var(--success)' : 'var(--text-secondary)',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {/* Current question */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>Question {currentQ + 1} of {quiz.questions.length}</p>
            <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 'var(--space-5)' }}>{q.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {q.options.map(opt => {
                const letter = opt.charAt(0).toUpperCase();
                const selected = String(quiz.answers[q.id] || '').trim().toUpperCase() === letter;
                return (
                  <button
                    key={opt}
                    className={`quiz-option ${selected ? 'quiz-option--selected' : ''}`}
                    onClick={() => handleAnswer(q.id, letter)}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? 'var(--accent)' : 'var(--border-default)'}`, background: selected ? 'var(--accent)' : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>← Previous</button>
            {currentQ < quiz.questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrentQ(currentQ + 1)}>Next →</button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={answered < quiz.questions.length}>
                <Trophy size={15} /> Submit Quiz ({answered}/{quiz.questions.length})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Setup view
  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Quiz Generator</h1>
          <p className="page-subtitle">Test your understanding with personalized quizzes.</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            <Brain size={20} style={{ color: 'var(--accent)' }} />
            <h2 className="section-title">Create a Quiz</h2>
          </div>
          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Topic *</label>
              <input className="form-input" value={form.topic} onChange={update('topic')} placeholder="e.g. Python functions, World War II, Photosynthesis" required />
            </div>
            <div className="form-row form-row-2">
              <div className="form-group">
                <label className="form-label">Number of Questions</label>
                <select className="form-input form-select" value={form.numQuestions} onChange={update('numQuestions')}>
                  {['3', '5', '8', '10', '15', '20'].map(n => <option key={n} value={n}>{n} questions</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty</label>
                <select className="form-input form-select" value={form.difficulty} onChange={update('difficulty')}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={generating} style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {generating ? <><Loader size={18} className="spin" />Generating Quiz...</> : <><Sparkles size={18} />Generate Quiz</>}
            </button>
          </form>
        </div>

        {generating && (
          <div className="card" style={{ marginTop: 'var(--space-5)', textAlign: 'center', padding: 'var(--space-8)' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Gemini AI is creating your quiz on "<strong>{form.topic}</strong>"...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { QuizGenerator };
