import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Check, Edit2, Trash2, Calendar, Clock, X } from 'lucide-react';
import api from '../lib/api';
import { Task } from '../types';
import { formatDeadline, getTaskTypeIcon, isOverdue } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal';
import { DateTimePicker } from '../components/DateTimePicker';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'high';

interface TaskFormData {
  title: string;
  description: string;
  subject: string;
  task_type: Task['task_type'];
  priority: Task['priority'];
  status: Task['status'];
  deadline: string;
  estimated_minutes: string;
}

const defaultForm: TaskFormData = {
  title: '', description: '', subject: '', task_type: 'assignment',
  priority: 'medium', status: 'pending', deadline: '', estimated_minutes: '',
};

const Tasks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/tasks');
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch { toast.error('Failed to load tasks'); }
    finally { setLoading(false); }
  };

  const openCreate = () => { setEditTask(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditTask(task);
    setForm({
      title: task.title, description: task.description, subject: task.subject,
      task_type: task.task_type, priority: task.priority, status: task.status,
      deadline: task.deadline ? task.deadline.slice(0, 16) : '',
      estimated_minutes: task.estimated_minutes?.toString() || '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        deadline: form.deadline || null,
        estimated_minutes: form.estimated_minutes ? parseInt(form.estimated_minutes) : null,
      };
      if (editTask) {
        const res = await api.put(`/api/tasks/${editTask.id}`, payload);
        setTasks(prev => prev.map(t => t.id === editTask.id ? res.data : t));
        toast.success('Task updated');
      } else {
        const res = await api.post('/api/tasks', payload);
        setTasks(prev => [res.data, ...prev]);
        toast.success('Task created');
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task');
    } finally { setSaving(false); }
  };

  const handleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const res = await api.put(`/api/tasks/${task.id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
      if (newStatus === 'completed') toast.success('Task completed! 🎉');
    } catch { toast.error('Failed to update task'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/tasks/${id}`);
      setTasks(prev => prev.filter(t => t.id !== id));
      setDeleteConfirm(null);
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  const update = (k: keyof TaskFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Unique subjects
  const subjects = Array.from(new Set(tasks.map(t => t.subject).filter(Boolean)));

  const filtered = tasks
    .filter(t => {
      if (filter === 'all') return true;
      if (filter === 'high') return t.priority === 'high';
      return t.status === filter;
    })
    .filter(t => subjectFilter === 'all' || t.subject === subjectFilter)
    .filter(t => typeFilter === 'all' || t.task_type === typeFilter)
    .filter(t => {
      if (deadlineFilter === 'all') return true;
      if (deadlineFilter === 'overdue') return isOverdue(t.deadline) && t.status !== 'completed';
      if (deadlineFilter === 'has_deadline') return !!t.deadline;
      return true;
    })
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    high: tasks.filter(t => t.priority === 'high').length,
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">Manage assignments, exams, projects, and study sessions.</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> + Add Task
          </button>
        </div>
      </div>

      {/* Primary Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'pending', 'in_progress', 'completed', 'high'] as FilterStatus[]).map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'filter-tab--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'high' ? 'High Priority' : f.replace('_', ' ')}
            <span className="filter-tab-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Secondary Filters & Search Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <div className="search-bar" style={{ marginBottom: 0 }}>
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search tasks by title or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>

        {subjects.length > 0 && (
          <select
            className="form-input form-select"
            style={{ width: 'auto', minWidth: 130, padding: '8px 12px' }}
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        <select
          className="form-input form-select"
          style={{ width: 'auto', minWidth: 120, padding: '8px 12px' }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          aria-label="Filter by task type"
        >
          <option value="all">All Types</option>
          <option value="assignment">Assignment</option>
          <option value="exam">Exam</option>
          <option value="project">Project</option>
          <option value="homework">Homework</option>
          <option value="study">Study</option>
        </select>

        <select
          className="form-input form-select"
          style={{ width: 'auto', minWidth: 130, padding: '8px 12px' }}
          value={deadlineFilter}
          onChange={e => setDeadlineFilter(e.target.value)}
          aria-label="Filter by deadline"
        >
          <option value="all">All Deadlines</option>
          <option value="overdue">Overdue Only</option>
          <option value="has_deadline">With Deadlines</option>
        </select>
      </div>

      {/* Task list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Plus size={24} /></div>
          <p className="empty-state-title">{search ? 'No tasks match your search' : "You don't have any tasks yet."}</p>
          <p className="empty-state-text">{search ? 'Try a different search term.' : 'Create your first task to get started.'}</p>
          {!search && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add your first task</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtered.map(task => (
            <Link
              to={`/tasks/${task.id}`}
              key={task.id}
              className={`task-item ${task.status === 'completed' ? 'task-item--completed' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              <button
                className={`task-check ${task.status === 'completed' ? 'task-check--done' : ''}`}
                onClick={e => handleComplete(task, e)}
                title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
              >
                {task.status === 'completed' && <Check size={13} />}
              </button>

              <div className="task-content">
                <div className="task-title">
                  {getTaskTypeIcon(task.task_type)} {task.title}
                </div>
                <div className="task-meta">
                  <span className="task-meta-item">{task.subject}</span>
                  <span className="task-meta-item">·</span>
                  <span className="task-meta-item" style={{ textTransform: 'capitalize' }}>{task.task_type}</span>
                  {task.deadline && (
                    <>
                      <span className="task-meta-item">·</span>
                      <span className="task-meta-item" style={{ color: isOverdue(task.deadline) ? 'var(--danger)' : 'var(--text-muted)' }}>
                        <Calendar size={11} />{formatDeadline(task.deadline)}
                      </span>
                    </>
                  )}
                  {task.estimated_minutes && (
                    <>
                      <span className="task-meta-item">·</span>
                      <span className="task-meta-item"><Clock size={11} />{task.estimated_minutes}min</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                <span className={`badge badge-${task.status}`} style={{ display: 'none' }}>{task.status.replace('_', ' ')}</span>
                <div className="task-actions">
                  <button className="btn btn-icon btn-ghost" onClick={e => openEdit(task, e)} title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-icon btn-ghost"
                    style={{ color: 'var(--danger)' }}
                    onClick={e => { e.stopPropagation(); e.preventDefault(); setDeleteConfirm(task.id); }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTask ? 'Edit Task' : 'New Task'}
        size="lg"
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={update('title')} placeholder="e.g. Complete Physics assignment" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input form-textarea" value={form.description} onChange={update('description')} placeholder="Additional details..." />
          </div>
          <div className="form-row form-row-2">
            <div className="form-group">
              <label className="form-label">Subject *</label>
              <input className="form-input" value={form.subject} onChange={update('subject')} placeholder="e.g. Physics" required />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input form-select" value={form.task_type} onChange={update('task_type')}>
                <option value="assignment">Assignment</option>
                <option value="exam">Exam</option>
                <option value="project">Project</option>
                <option value="homework">Homework</option>
                <option value="study">Study</option>
              </select>
            </div>
          </div>
          <div className="form-row form-row-3">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={update('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={update('status')}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Est. Time (min)</label>
              <input className="form-input" type="number" min="0" value={form.estimated_minutes} onChange={update('estimated_minutes')} placeholder="60" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <DateTimePicker
              id="task-deadline"
              value={form.deadline}
              onChange={(newVal) => setForm(f => ({ ...f, deadline: newVal }))}
              placeholder="Select deadline"
            />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><div className="loading-spinner loading-spinner--sm" />Saving...</> : editTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Task"
        maxWidth={420}
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-6)' }}>
          Are you sure you want to delete this task? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete Task</button>
        </div>
      </Modal>
    </div>
  );
};

export { Tasks };
