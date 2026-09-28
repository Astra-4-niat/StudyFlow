import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, User, Tag, Sparkles, Check, Loader } from 'lucide-react';
import api from '../lib/api';
import { Task, TaskBreakdown } from '../types';
import { formatDate, formatDeadline, formatMinutes, isOverdue } from '../utils/helpers';
import toast from 'react-hot-toast';

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<TaskBreakdown | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    try {
      const res = await api.get(`/api/tasks/${id}`);
      setTask(res.data);
    } catch {
      toast.error('Task not found');
      navigate('/tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await api.put(`/api/tasks/${task.id}`, { status: newStatus });
      setTask(res.data);
      if (newStatus === 'completed') toast.success('Task completed! 🎉');
    } catch { toast.error('Failed to update task'); }
  };

  const handleBreakdown = async () => {
    if (!task) return;
    setBreakdownLoading(true);
    try {
      const res = await api.post('/api/ai/task-breakdown', {
        taskId: task.id,
        title: task.title,
        description: task.description,
        subject: task.subject,
      });
      setBreakdown(res.data);
    } catch {
      toast.error('AI service temporarily unavailable. Please try again.');
    } finally {
      setBreakdownLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
      <div className="loading-spinner" />
    </div>
  );

  if (!task) return null;

  const overdue = isOverdue(task.deadline) && task.status !== 'completed';

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')} style={{ marginBottom: 'var(--space-4)' }}>
          <ArrowLeft size={16} /> Back to Tasks
        </button>
        <div className="page-header-row">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span className={`badge badge-${task.priority}`}>{task.priority} priority</span>
              <span className={`badge badge-${task.status}`}>{task.status.replace('_', ' ')}</span>
              {overdue && <span className="badge" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>Overdue</span>}
            </div>
            <h1 className="page-title">{task.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className={`btn ${task.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
              onClick={handleComplete}
            >
              <Check size={16} /> {task.status === 'completed' ? 'Mark Incomplete' : 'Mark Complete'}
            </button>
          </div>
        </div>
      </div>

      <div className="task-detail-grid">
        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Details card */}
          <div className="card">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-5)' }}>Task Details</h2>
            {task.description && (
              <div style={{ marginBottom: 'var(--space-5)' }}>
                <p className="label" style={{ marginBottom: 'var(--space-2)' }}>Description</p>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{task.description}</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              {[
                { icon: Tag, label: 'Subject', value: task.subject },
                { icon: Tag, label: 'Type', value: task.task_type, capitalize: true },
                { icon: Calendar, label: 'Deadline', value: task.deadline ? `${formatDeadline(task.deadline)} (${formatDate(task.deadline)})` : 'No deadline', color: overdue ? 'var(--danger)' : undefined },
                { icon: Clock, label: 'Estimated Time', value: task.estimated_minutes ? formatMinutes(task.estimated_minutes) : 'Not set' },
                { icon: Calendar, label: 'Created', value: formatDate(task.created_at) },
                { icon: Calendar, label: 'Last Updated', value: formatDate(task.updated_at) },
              ].map(({ icon: Icon, label, value, capitalize, color }) => (
                <div key={label} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={15} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div>
                    <p className="label" style={{ marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 14, color: color || 'var(--text-primary)', fontWeight: 500, textTransform: capitalize ? 'capitalize' : 'none' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Breakdown */}
          <div className="card">
            <div className="section-header" style={{ marginBottom: breakdown ? 'var(--space-5)' : 0 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
                  <Sparkles size={18} style={{ color: 'var(--accent)' }} />
                  <h2 className="section-title">AI Task Breakdown</h2>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Let Gemini AI break this task into actionable steps</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={handleBreakdown} disabled={breakdownLoading}>
                {breakdownLoading ? <><Loader size={14} className="spin" />Analyzing...</> : <><Sparkles size={14} />Break This Task Down</>}
              </button>
            </div>

            {breakdown && (
              <div style={{ marginTop: 'var(--space-5)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {breakdown.steps.map(step => (
                    <div key={step.stepNumber} style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ width: 28, height: 28, background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 'var(--radius-pill)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                        {step.stepNumber}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{step.title}</p>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.description}</p>
                        {step.tips && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontStyle: 'italic' }}>💡 {step.tips}</p>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                          <Clock size={11} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step.estimatedMinutes}min</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {breakdown.advice && (
                  <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--accent-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(108,99,255,0.2)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      <strong style={{ color: 'var(--accent)' }}>AI Advice:</strong> {breakdown.advice}
                    </p>
                  </div>
                )}
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
                  Total estimated: {formatMinutes(breakdown.totalEstimatedMinutes)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 'var(--space-4)', fontSize: 15 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button className="btn btn-secondary" style={{ justifyContent: 'flex-start' }} onClick={handleBreakdown} disabled={breakdownLoading}>
                <Sparkles size={15} /> Break down with AI
              </button>
              <Link to="/planner" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <Calendar size={15} /> Generate study plan
              </Link>
              <Link to="/copilot" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                <User size={15} /> Ask AI Copilot
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { TaskDetail };
