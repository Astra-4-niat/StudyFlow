import React, { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Check, Edit2, Trash2, Calendar as CalendarIcon,
  Clock, X, ChevronLeft, ChevronRight, List, CalendarPlus, AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import { Task } from '../types';
import { formatDeadline, getTaskTypeIcon, isOverdue } from '../utils/helpers';
import toast from 'react-hot-toast';
import { Modal } from '../components/Modal';
import { DateTimePicker } from '../components/DateTimePicker';
import { storage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'high';
type ViewMode = 'calendar' | 'list';

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

// Date format helpers
const getTodayKey = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTaskDateKey = (deadline: string | null | undefined): string | null => {
  if (!deadline) return null;
  const match = deadline.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatSelectedDateTitle = (dateKey: string): string => {
  const parts = dateKey.split('-');
  if (parts.length !== 3) return dateKey;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const todayKey = getTodayKey();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const prefix = dateKey === todayKey ? 'Today — ' : dateKey === tomorrowKey ? 'Tomorrow — ' : '';
  return prefix + d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
};

const Tasks: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks(user?.id));
  const [loading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [groupByDay, setGroupByDay] = useState(true);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getTodayKey());

  // Modal and CRUD states
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, [user?.id]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const fetchTasks = async () => {
    // 1. Immediately display local phone storage (0ms)
    const local = storage.getTasks(user?.id);
    setTasks(local);

    // 2. Silent background sync to get any cloud-created tasks without blocking UI
    try {
      const res = await api.get('/api/tasks');
      if (Array.isArray(res.data) && res.data.length > 0) {
        const localMap = new Map(local.map(t => [t.id, t]));
        let hasNew = false;
        res.data.forEach((serverTask: Task) => {
          if (!localMap.has(serverTask.id)) {
            localMap.set(serverTask.id, serverTask);
            hasNew = true;
          }
        });
        if (hasNew) {
          const merged = Array.from(localMap.values());
          setTasks(merged);
          localStorage.setItem(`studyflow_tasks_${user?.id || 'guest'}`, JSON.stringify(merged));
        }
      }
    } catch {
      // Local storage continues running smoothly offline
    }
  };

  const openCreate = () => {
    setEditTask(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openCreateForDate = (dateKey: string) => {
    setEditTask(null);
    setForm({
      ...defaultForm,
      deadline: `${dateKey}T12:00`,
    });
    setShowModal(true);
  };

  const openEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditTask(task);
    setForm({
      title: task.title,
      description: task.description,
      subject: task.subject,
      task_type: task.task_type,
      priority: task.priority,
      status: task.status,
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
        const updated = storage.updateTask(editTask.id, payload, user?.id);
        if (updated) {
          setTasks(prev => prev.map(t => t.id === editTask.id ? updated : t));
        }
        toast.success('Task updated');
      } else {
        const created = storage.saveTask(payload, user?.id);
        setTasks(prev => [created, ...prev]);
        toast.success('Task created');
      }
      setShowModal(false);
    } catch {
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updated = storage.updateTask(task.id, { status: newStatus }, user?.id);
    if (updated) {
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
      if (newStatus === 'completed') toast.success('Task completed! 🎉');
    }
  };

  const handleDelete = (id: string) => {
    storage.deleteTask(id, user?.id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
    toast.success('Task deleted');
  };

  const update = (k: keyof TaskFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // Month navigation
  const handlePrevMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCalendarMonth(today);
    setSelectedDateKey(getTodayKey());
  };

  // Filter tasks
  const filtered = useMemo(() => {
    return tasks
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
  }, [tasks, filter, subjectFilter, typeFilter, deadlineFilter, search]);

  // Map of tasks by date (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    filtered.forEach(task => {
      const key = getTaskDateKey(task.deadline);
      if (key) {
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [filtered]);

  // Tasks for currently selected day in calendar
  const selectedDateTasks = useMemo(() => {
    return tasksByDate[selectedDateKey] || [];
  }, [tasksByDate, selectedDateKey]);

  // Unique subjects
  const subjects = useMemo(() => {
    return Array.from(new Set(tasks.map(t => t.subject).filter(Boolean)));
  }, [tasks]);

  const todayKey = getTodayKey();
  const todayTasks = useMemo(() => {
    return tasks.filter(t => getTaskDateKey(t.deadline) === todayKey);
  }, [tasks, todayKey]);

  const todayCompleted = todayTasks.filter(t => t.status === 'completed').length;
  const todayProgress = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    high: tasks.filter(t => t.priority === 'high').length,
  };

  // Calendar Grid Cells Computation
  const calendarGridDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay(); // 0 = Sunday

    const days: Array<{
      date: Date;
      key: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      tasks: Task[];
    }> = [];

    const todayKey = getTodayKey();

    // Previous month filler
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        key,
        dayNumber: prevMonthLastDate - i,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        tasks: tasksByDate[key] || [],
      });
    }

    // Current month days
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date: d,
        key,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        tasks: tasksByDate[key] || [],
      });
    }

    // Next month filler
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        key,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: key === todayKey,
        isSelected: key === selectedDateKey,
        tasks: tasksByDate[key] || [],
      });
    }

    return days;
  }, [calendarMonth, selectedDateKey, tasksByDate]);

  // Grouped task categories for List View
  const groupedTasks = useMemo(() => {
    const todayKey = getTodayKey();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const overdue: Task[] = [];
    const today: Task[] = [];
    const nextDay: Task[] = [];
    const thisWeek: Task[] = [];
    const upcoming: Task[] = [];
    const noDeadline: Task[] = [];

    const weekLimit = new Date();
    weekLimit.setDate(weekLimit.getDate() + 7);

    filtered.forEach(task => {
      if (task.status === 'completed') {
        upcoming.push(task);
        return;
      }
      if (!task.deadline) {
        noDeadline.push(task);
        return;
      }
      if (isOverdue(task.deadline)) {
        overdue.push(task);
        return;
      }
      const k = getTaskDateKey(task.deadline);
      if (k === todayKey) {
        today.push(task);
      } else if (k === tomorrowKey) {
        nextDay.push(task);
      } else {
        const d = new Date(task.deadline);
        if (d <= weekLimit) {
          thisWeek.push(task);
        } else {
          upcoming.push(task);
        }
      }
    });

    return [
      { id: 'overdue', title: 'Overdue', icon: AlertCircle, color: 'var(--danger)', tasks: overdue },
      { id: 'today', title: 'Today', icon: CalendarIcon, color: 'var(--accent)', tasks: today },
      { id: 'tomorrow', title: 'Tomorrow', icon: CalendarIcon, color: 'var(--warning)', tasks: nextDay },
      { id: 'this_week', title: 'This Week', icon: CalendarIcon, color: 'var(--text-secondary)', tasks: thisWeek },
      { id: 'upcoming', title: 'Upcoming & Completed', icon: Check, color: 'var(--text-muted)', tasks: upcoming },
      { id: 'no_deadline', title: 'No Deadline', icon: Clock, color: 'var(--text-muted)', tasks: noDeadline },
    ].filter(g => g.tasks.length > 0);
  }, [filtered]);

  return (
    <div className="fade-up">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle">Schedule, track, and complete your academic priorities.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {/* View Mode Toggle: Calendar vs List */}
            <div className="view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'calendar' ? 'view-mode-btn--active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Calendar view sorted by day"
              >
                <CalendarIcon size={14} /> Calendar
              </button>
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'list' ? 'view-mode-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={14} /> List
              </button>
            </div>

            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> + Add Task
            </button>
          </div>
        </div>
      </div>

      {/* Today's Target Card - Always Visible */}
      <div className="today-target-card">
        <div className="today-target-header">
          <div>
            <div className="today-target-title">
              <span>🎯</span>
              <span>Today's Targets</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>
                ({new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {todayTasks.length === 0
                ? 'No targets scheduled for today. Set a goal or study block to stay ahead!'
                : `${todayCompleted} of ${todayTasks.length} target${todayTasks.length !== 1 ? 's' : ''} completed (${todayProgress}%)`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {todayTasks.length > 0 && todayCompleted === todayTasks.length && (
              <span className="badge badge-success" style={{ fontSize: 12, padding: '4px 10px' }}>
                🎉 All targets completed today!
              </span>
            )}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => openCreateForDate(todayKey)}
              style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
            >
              <Plus size={13} /> + Add Today's Target
            </button>
          </div>
        </div>

        {todayTasks.length > 0 && (
          <>
            <div className="today-progress-bar">
              <div
                className="today-progress-fill"
                style={{
                  width: `${todayProgress}%`,
                  background: todayProgress === 100 ? 'var(--success)' : 'var(--accent)',
                }}
              />
            </div>

            <div className="today-targets-grid">
              {todayTasks.map(task => (
                <div
                  key={task.id}
                  className={`today-target-item ${task.status === 'completed' ? 'today-target-item--done' : ''}`}
                >
                  <button
                    className={`task-check ${task.status === 'completed' ? 'task-check--done' : ''}`}
                    onClick={(e) => handleComplete(task, e)}
                    title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {task.status === 'completed' && <Check size={12} />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/tasks/${task.id}`}
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span className="badge badge-accent" style={{ fontSize: 9.5, padding: '0 5px' }}>
                        {task.subject}
                      </span>
                      <span className={`badge badge-priority-${task.priority}`} style={{ fontSize: 9.5, padding: '0 5px' }}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
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
      <div className="tasks-filter-bar">
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

      {/* Main Content Area */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      ) : viewMode === 'calendar' ? (
        /* ================= CALENDAR VIEW ================= */
        <div className="task-calendar-layout">
          {/* Month Calendar Card */}
          <div className="task-calendar-card">
            {/* Calendar Navigation */}
            <div className="task-calendar-nav">
              <div className="task-calendar-month-title">
                <CalendarIcon size={18} style={{ color: 'var(--accent)' }} />
                <span>
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleToday}
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost btn-sm"
                  onClick={handlePrevMonth}
                  title="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost btn-sm"
                  onClick={handleNextMonth}
                  title="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekday Names */}
            <div className="task-calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
                <div key={w} className="task-calendar-weekday">{w}</div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="task-calendar-grid">
              {calendarGridDays.map(day => (
                <div
                  key={day.key}
                  className={`task-cal-cell ${!day.isCurrentMonth ? 'task-cal-cell--outside' : ''} ${day.isToday ? 'task-cal-cell--today' : ''} ${day.isSelected ? 'task-cal-cell--selected' : ''}`}
                  onClick={() => setSelectedDateKey(day.key)}
                >
                  <div className="task-cal-cell-header">
                    <span className="task-cal-num">{day.dayNumber}</span>
                    {day.tasks.length > 0 && (
                      <span className="task-cal-badge" title={`${day.tasks.length} task${day.tasks.length > 1 ? 's' : ''}`}>
                        {day.tasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tasks preview on day cell */}
                  {day.tasks.length > 0 ? (
                    <div className="task-cal-chips">
                      {day.tasks.slice(0, 2).map(t => (
                        <div
                          key={t.id}
                          className={`task-cal-chip ${t.status === 'completed' ? 'task-cal-chip--completed' : ''}`}
                          title={`${t.title} (${t.subject})`}
                        >
                          <span className={`task-dot task-dot--${t.status === 'completed' ? 'completed' : t.priority}`} />
                          <span>{t.title}</span>
                        </div>
                      ))}
                      {day.tasks.length > 2 && (
                        <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                          +{day.tasks.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        style={{
                          opacity: 0.35,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 2,
                          color: 'var(--text-muted)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateKey(day.key);
                          openCreateForDate(day.key);
                        }}
                        title={`Schedule task on ${day.key}`}
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Day Task Panel */}
          <div className="calendar-day-panel" key={selectedDateKey}>
            <div className="calendar-day-header">
              <div>
                <h3 className="calendar-day-title">{formatSelectedDateTitle(selectedDateKey)}</h3>
                <p className="calendar-day-subtitle">
                  {selectedDateTasks.length === 0
                    ? 'No tasks scheduled'
                    : `${selectedDateTasks.length} task${selectedDateTasks.length > 1 ? 's' : ''} (${selectedDateTasks.filter(t => t.status === 'completed').length} done)`}
                </p>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => openCreateForDate(selectedDateKey)}
                style={{ whiteSpace: 'nowrap' }}
              >
                <Plus size={14} /> Add Task
              </button>
            </div>

            {selectedDateTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
                <div className="empty-state-icon" style={{ width: 44, height: 44, margin: '0 auto 12px' }}>
                  <CalendarPlus size={22} />
                </div>
                <p className="empty-state-title" style={{ fontSize: 14 }}>No tasks for this day</p>
                <p className="empty-state-text" style={{ fontSize: 12, marginBottom: 12 }}>
                  Click below to plan an assignment, exam review, or study session for this day.
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => openCreateForDate(selectedDateKey)}
                >
                  + Add Task for {formatSelectedDateTitle(selectedDateKey).split('—')[0].trim()}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {selectedDateTasks.map(task => (
                  <div
                    key={task.id}
                    className={`task-item ${task.status === 'completed' ? 'task-item--completed' : ''}`}
                    style={{ padding: '10px 12px' }}
                  >
                    <button
                      className={`task-check ${task.status === 'completed' ? 'task-check--done' : ''}`}
                      onClick={(e) => handleComplete(task, e)}
                      title={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.status === 'completed' && <Check size={12} />}
                    </button>

                    <Link to={`/tasks/${task.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                      <p style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {task.title}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge badge-accent" style={{ fontSize: 10, padding: '1px 6px' }}>
                          {task.subject}
                        </span>
                        <span className={`badge badge-priority-${task.priority}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                          {task.priority}
                        </span>
                        {task.estimated_minutes && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Clock size={11} /> {task.estimated_minutes}m
                          </span>
                        )}
                      </div>
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="btn btn-icon btn-ghost btn-sm"
                        onClick={(e) => openEdit(task, e)}
                        title="Edit task"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="btn btn-icon btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteConfirm(task.id)}
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================= LIST VIEW (WITH DAY SORTING) ================= */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing {filtered.length} task{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setGroupByDay(!groupByDay)}
              style={{ fontSize: 12 }}
            >
              {groupByDay ? 'Ungroup List' : 'Group by Day'}
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Plus size={24} /></div>
              <p className="empty-state-title">{search ? 'No tasks match your search' : "You don't have any tasks yet."}</p>
              <p className="empty-state-text">{search ? 'Try a different search term.' : 'Create your first task to get started.'}</p>
              {!search && <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add your first task</button>}
            </div>
          ) : groupByDay ? (
            groupedTasks.map(group => (
              <div key={group.id} className="task-group-section">
                <div className="task-group-title" style={{ color: group.color }}>
                  <group.icon size={14} />
                  <span>{group.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                    ({group.tasks.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {group.tasks.map(task => (
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
                                <CalendarIcon size={11} />{formatDeadline(task.deadline)}
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
              </div>
            ))
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
                            <CalendarIcon size={11} />{formatDeadline(task.deadline)}
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
