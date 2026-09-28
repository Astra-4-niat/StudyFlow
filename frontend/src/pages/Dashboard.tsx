import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertTriangle, BookOpen, ArrowRight, Sparkles,
  RefreshCw, Calendar, Plus, Bot, Brain
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Task } from '../types';
import { formatDeadline } from '../utils/helpers';
import toast from 'react-hot-toast';

interface Stats {
  total: number;
  completed: number;
  pending: number;
  studyMinutes: number;
}

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0, studyMinutes: 0 });
  const [recommendation, setRecommendation] = useState('');
  const [recLoading, setRecLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tasksRes, sessionsRes] = await Promise.all([
        api.get('/api/tasks'),
        api.get('/api/study-sessions'),
      ]);
      const allTasks: Task[] = Array.isArray(tasksRes.data) ? tasksRes.data : [];
      setTasks(allTasks);
      const allSessions: { duration_minutes?: number }[] = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
      const totalMinutes = allSessions.reduce((sum: number, s: { duration_minutes?: number }) => sum + (s.duration_minutes || 0), 0);
      setStats({
        total: allTasks.length,
        completed: allTasks.filter(t => t.status === 'completed').length,
        pending: allTasks.filter(t => t.status !== 'completed').length,
        studyMinutes: totalMinutes,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendation = async () => {
    setRecLoading(true);
    try {
      const res = await api.post('/api/ai/recommendation', {});
      setRecommendation(res.data.recommendation);
    } catch {
      setRecommendation('Stay consistent with your revision. Focus on upcoming deadlines first.');
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) fetchRecommendation();
  }, [loading]);

  const handleTaskToggle = async (task: Task, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await api.put(`/api/tasks/${task.id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
      if (newStatus === 'completed') toast.success('Task completed! 🎉');
      setStats(prev => ({
        ...prev,
        completed: newStatus === 'completed' ? prev.completed + 1 : prev.completed - 1,
        pending: newStatus === 'completed' ? prev.pending - 1 : prev.pending + 1,
      }));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const upcomingDeadlines = tasks
    .filter(t => t.deadline && t.status !== 'completed')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);
  const todayFocus = activeTasks.filter(t => t.priority === 'high').slice(0, 4);
  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div style={{ padding: '40px 0' }}>
        <div className="skeleton" style={{ height: 32, width: 280, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 18, width: 200, marginBottom: 32 }} />
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {firstName} 👋</h1>
          <p className="page-subtitle">Here's what your academic day looks like.</p>
        </div>
        <Link to="/tasks?create=true" className="btn btn-primary btn-sm">
          <Plus size={15} /> Add Task
        </Link>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar">
        <Link to="/tasks?create=true" className="quick-action-btn">
          <div className="quick-action-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Plus size={17} />
          </div>
          <div>
            <div>Add Task</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>New assignment</span>
          </div>
        </Link>

        <Link to="/planner" className="quick-action-btn">
          <div className="quick-action-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            <Sparkles size={17} />
          </div>
          <div>
            <div>Study Plan</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Generate with AI</span>
          </div>
        </Link>

        <Link to="/quiz" className="quick-action-btn">
          <div className="quick-action-icon" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>
            <Brain size={17} />
          </div>
          <div>
            <div>Generate Quiz</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Test your knowledge</span>
          </div>
        </Link>

        <Link to="/copilot" className="quick-action-btn">
          <div className="quick-action-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <Bot size={17} />
          </div>
          <div>
            <div>Ask AI Copilot</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Academic assistant</span>
          </div>
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Total Tasks</span>
            <div className="stat-card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="stat-card-value">{stats.total}</div>
          <div className="stat-card-label">{stats.pending} active</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Completed</span>
            <div className="stat-card-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
              <CheckSquare size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--success)' }}>{stats.completed}</div>
          <div className="stat-card-label">{completionPct}% completion rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Upcoming</span>
            <div className="stat-card-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-card-value" style={{ color: 'var(--warning)' }}>{upcomingDeadlines.length}</div>
          <div className="stat-card-label">with deadlines</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="label">Study Time</span>
            <div className="stat-card-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-card-value">
            {Math.floor(stats.studyMinutes / 60)}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}>h</span>
          </div>
          <div className="stat-card-label">{stats.studyMinutes % 60}min total</div>
        </div>
      </div>

      {/* Content grid */}
      <div className="dashboard-grid">
        {/* Today's Focus */}
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Today's Focus</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>High-priority items to tackle today</p>
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">
              View all tasks <ArrowRight size={14} />
            </Link>
          </div>
          {todayFocus.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <div className="empty-state-icon"><CheckSquare size={24} /></div>
              <p className="empty-state-title">No high-priority tasks</p>
              <p className="empty-state-text">You're all caught up on critical items.</p>
              <Link to="/tasks?create=true" className="btn btn-primary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
                <Plus size={14} /> Add Task
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {todayFocus.map(task => (
                <div key={task.id} className="task-item" style={{ cursor: 'pointer' }}>
                  <button
                    className={`task-check ${task.status === 'completed' ? 'task-check--checked' : ''}`}
                    onClick={(e) => handleTaskToggle(task, e)}
                    aria-label="Toggle task status"
                  />
                  <Link to={`/tasks/${task.id}`} className="task-content" style={{ textDecoration: 'none' }}>
                    <div className="task-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                      {task.title}
                    </div>
                    <div className="task-meta">
                      <span className="task-meta-item">{task.subject}</span>
                      {task.deadline && (
                        <span className="task-meta-item">
                          <Calendar size={11} />
                          {formatDeadline(task.deadline)}
                        </span>
                      )}
                    </div>
                  </Link>
                  <span className="badge badge-high">High</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Upcoming Deadlines</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Items due soon</p>
            </div>
            <Link to="/tasks" className="btn btn-ghost btn-sm">
              View calendar/tasks <ArrowRight size={14} />
            </Link>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-8) 0' }}>
              <div className="empty-state-icon"><Calendar size={24} /></div>
              <p className="empty-state-title">No upcoming deadlines</p>
              <p className="empty-state-text">Tasks with deadlines will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {upcomingDeadlines.map(task => (
                <Link to={`/tasks/${task.id}`} key={task.id} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{task.subject}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>{formatDeadline(task.deadline!)}</p>
                      <span className={`badge badge-${task.priority}`} style={{ marginTop: 4 }}>{task.priority}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Progress Overview */}
        <div className="card">
          <div className="section-header">
            <div>
              <h2 className="section-title">Progress Overview</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your academic momentum</p>
            </div>
            <Link to="/progress" className="btn btn-ghost btn-sm">
              View analytics <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tasks completed: {completionPct}%</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {stats.completed} / {stats.total}
                </span>
              </div>
              <div className="progress-bar-container" style={{ height: 8 }}>
                <div className="progress-bar progress-bar--success" style={{ width: `${completionPct}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>{stats.completed}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Completed</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--warning)' }}>{stats.pending}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Remaining</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--info)' }}>{Math.round((stats.studyMinutes / 60) * 10) / 10}h</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Study Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))', borderColor: 'rgba(108,99,255,0.2)' }}>
          <div className="section-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <h2 className="section-title">AI Recommendation</h2>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Personalized guidance</p>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={fetchRecommendation}
              disabled={recLoading}
              aria-label="Refresh recommendation"
            >
              <RefreshCw size={14} className={recLoading ? 'spin' : ''} />
            </button>
          </div>

          {recLoading ? (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', color: 'var(--text-muted)', fontSize: 14, padding: 'var(--space-4) 0' }}>
              <div className="loading-spinner loading-spinner--sm" />
              <span>Analyzing your academic schedule...</span>
            </div>
          ) : recommendation ? (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 'var(--space-2) 0' }}>
              {recommendation}
            </p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 14, padding: 'var(--space-4) 0' }}>
              <BookOpen size={16} />
              <span>Add tasks to get personalized AI recommendations</span>
            </div>
          )}

          <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
            <Link to="/copilot" className="btn btn-primary btn-sm">
              <Bot size={14} /> Open AI Copilot →
            </Link>
            <Link to="/planner" className="btn btn-secondary btn-sm">
              <Sparkles size={14} /> Study Planner
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export { Dashboard };

