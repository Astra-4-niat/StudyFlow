import React, { useEffect, useState } from 'react';
import { CheckSquare, Clock, Brain, BookOpen, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../lib/api';
import { Task, StudySession, Quiz } from '../types';
import { formatDate, formatMinutes } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal';
import { storage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#6c63ff', '#a855f7', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];

const Progress: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks(user?.id));
  const [sessions, setSessions] = useState<StudySession[]>(() => storage.getStudySessions(user?.id));
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => storage.getQuizzes(user?.id));
  const [loading] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ subject: '', duration_minutes: '30', task_id: '' });
  const [savingSession, setSavingSession] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    // 1. Immediately display local phone storage (0ms)
    const localTasks = storage.getTasks(user?.id);
    const localSessions = storage.getStudySessions(user?.id);
    const localQuizzes = storage.getQuizzes(user?.id);
    setTasks(localTasks);
    setSessions(localSessions);
    setQuizzes(localQuizzes);

    // 2. Silent background sync
    try {
      const [tasksRes, sessionsRes, quizzesRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/study-sessions'),
        api.get('/api/quizzes'),
      ]);
      if (Array.isArray(tasksRes.data) && tasksRes.data.length > 0) setTasks(tasksRes.data);
      if (Array.isArray(sessionsRes.data) && sessionsRes.data.length > 0) setSessions(sessionsRes.data);
      if (Array.isArray(quizzesRes.data) && quizzesRes.data.length > 0) setQuizzes(quizzesRes.data);
    } catch {
      // Local progress is always preserved offline
    }
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSession(true);
    try {
      const newSession = storage.saveStudySession({
        subject: sessionForm.subject || 'General Study',
        duration_minutes: parseInt(sessionForm.duration_minutes) || 30,
        task_id: sessionForm.task_id || null,
      }, user?.id);
      setSessions(prev => [newSession, ...prev]);
      setShowSessionModal(false);
      setSessionForm({ subject: '', duration_minutes: '30', task_id: '' });
      toast.success('Study session recorded on device!');
    } catch {
      toast.error('Failed to save session');
    } finally {
      setSavingSession(false);
    }
  };

  // Compute stats
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const avgQuizScore = quizzes.filter(q => q.score !== null).length > 0
    ? Math.round(quizzes.filter(q => q.score !== null).reduce((sum, q) => sum + ((q.score! / q.total_questions) * 100), 0) / quizzes.filter(q => q.score !== null).length)
    : 0;

  // Weekly study data (last 7 days)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toISOString().split('T')[0];
    const minutes = sessions
      .filter(s => s.completed_at?.startsWith(dayStr))
      .reduce((sum, s) => sum + s.duration_minutes, 0);
    return { day: date.toLocaleDateString('en', { weekday: 'short' }), minutes };
  });

  // Subject distribution
  const subjectMap: Record<string, number> = {};
  sessions.forEach(s => {
    subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.duration_minutes;
  });
  const subjectData = Object.entries(subjectMap).map(([name, value]) => ({ name, value }));

  // Task type breakdown
  const typeMap: Record<string, number> = {};
  tasks.forEach(t => { typeMap[t.task_type] = (typeMap[t.task_type] || 0) + 1; });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 8 }} />
      <div className="stats-grid">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)' }} />)}
      </div>
    </div>
  );

  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Progress</h1>
            <p className="page-subtitle">Understand your academic progress.</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowSessionModal(true)}>
            <Plus size={15} /> Log Study Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Completed</span>
            <div className="stat-card-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}><CheckSquare size={18} /></div>
          </div>
          <div className="stat-card-value">{completedTasks}</div>
          <div className="stat-card-label">{completionPct}% of {totalTasks} tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Study Time</span>
            <div className="stat-card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}><Clock size={18} /></div>
          </div>
          <div className="stat-card-value">{Math.floor(totalMinutes / 60)}<span style={{ fontSize: 16 }}>h</span></div>
          <div className="stat-card-label">{sessions.length} sessions logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Quizzes Taken</span>
            <div className="stat-card-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}><Brain size={18} /></div>
          </div>
          <div className="stat-card-value">{quizzes.length}</div>
          <div className="stat-card-label">Avg score: {avgQuizScore}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Active Tasks</span>
            <div className="stat-card-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}><BookOpen size={18} /></div>
          </div>
          <div className="stat-card-value">{totalTasks - completedTasks}</div>
          <div className="stat-card-label">tasks remaining</div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        {/* Weekly study */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>Weekly Study Time</h2>
          {weeklyData.every(d => d.minutes === 0) ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <p className="empty-state-title">No study sessions yet</p>
              <p className="empty-state-text">Log study sessions to see your weekly chart</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#8888a8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8888a8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  formatter={(val) => [`${val}min`, 'Study Time']}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="minutes" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Subject distribution */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>Subject Distribution</h2>
          {subjectData.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <p className="empty-state-title">No subject data yet</p>
              <p className="empty-state-text">Log study sessions to see the distribution</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={subjectData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {subjectData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  formatter={(val) => [`${val}min`, 'Study Time']}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Task completion + Recent sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* Task completion */}
        <div className="card">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>Task Completion</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Overall Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{completionPct}%</span>
              </div>
              <div className="progress-bar-container" style={{ height: 10 }}>
                <div className="progress-bar progress-bar--success" style={{ width: `${completionPct}%` }} />
              </div>
            </div>
            {typeData.map(({ name, value }, i) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{value}</span>
                </div>
                <div className="progress-bar-container" style={{ height: 6 }}>
                  <div className="progress-bar" style={{ width: `${(value / totalTasks) * 100}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sessions */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">Recent Study Sessions</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSessionModal(true)}><Plus size={14} /></button>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <p className="empty-state-title">No sessions yet</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowSessionModal(true)}>Log First Session</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {sessions.slice(0, 8).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.subject}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(s.completed_at)}</p>
                  </div>
                  <span className="badge badge-accent">{formatMinutes(s.duration_minutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Session Modal */}
      <Modal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title="Log Study Session"
        maxWidth={480}
      >
        <form onSubmit={handleSaveSession} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input className="form-input" value={sessionForm.subject} onChange={e => setSessionForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Physics" required />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <select className="form-input form-select" value={sessionForm.duration_minutes} onChange={e => setSessionForm(f => ({ ...f, duration_minutes: e.target.value }))}>
              {['15', '25', '30', '45', '60', '90', '120'].map(m => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Related Task (optional)</label>
            <select className="form-input form-select" value={sessionForm.task_id} onChange={e => setSessionForm(f => ({ ...f, task_id: e.target.value }))}>
              <option value="">None</option>
              {tasks.filter(t => t.status !== 'completed').map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowSessionModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={savingSession}>
              {savingSession ? 'Saving...' : 'Log Session'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export { Progress };
