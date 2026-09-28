import { Task } from '../types';

export const formatDeadline = (deadline: string): string => {
  const date = new Date(deadline);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatDateTimeDisplay = (deadline: string): string => {
  if (!deadline) return '';
  const date = new Date(deadline);
  if (isNaN(date.getTime())) return deadline;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();

  if (diffDays === 0) return `Today · ${timeStr}`;
  if (diffDays === 1) return `Tomorrow · ${timeStr}`;
  return `${day} ${month} ${year} · ${timeStr}`;
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

export const getPriorityColor = (priority: Task['priority']): string => {
  switch (priority) {
    case 'high': return 'var(--danger)';
    case 'medium': return 'var(--warning)';
    case 'low': return 'var(--success)';
  }
};

export const getStatusColor = (status: Task['status']): string => {
  switch (status) {
    case 'pending': return 'var(--text-muted)';
    case 'in_progress': return 'var(--warning)';
    case 'completed': return 'var(--success)';
  }
};

export const getTaskTypeIcon = (type: Task['task_type']): string => {
  switch (type) {
    case 'assignment': return '📝';
    case 'exam': return '📋';
    case 'project': return '🗂️';
    case 'homework': return '📚';
    case 'study': return '📖';
    default: return '📌';
  }
};

export const isOverdue = (deadline: string | null): boolean => {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
};

export const sortTasksByPriority = (tasks: Task[]): Task[] => {
  const order = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => order[a.priority] - order[b.priority]);
};
