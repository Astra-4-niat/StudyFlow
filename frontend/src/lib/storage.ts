import { Task, StudyPlan, StudySession, Quiz } from '../types';
import api from './api';

export interface SyncQueueItem {
  id: string;
  action: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'BATCH_TASKS' | 'CREATE_SESSION' | 'CREATE_PLAN';
  payload: any;
  timestamp: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: string | null;
}

// Helper to get storage keys scoped by user
const getStorageKey = (prefix: string, userId?: string): string => {
  return userId ? `studyflow_${prefix}_${userId}` : `studyflow_${prefix}_guest`;
};

// Generate realistic client UUID
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'sf_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
};

// Safe localStorage read
const readStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[StudyFlow Storage] Failed to read ${key}:`, err);
    return defaultValue;
  }
};

// Safe localStorage write
const writeStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[StudyFlow Storage] Failed to write ${key}:`, err);
  }
};

// Default sample tasks for new students to give immediate context
const createDefaultTasks = (userId: string = 'local'): Task[] => {
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0).toISOString();
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 20, 0, 0).toISOString();

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 3);
  const dayAfterIso = new Date(dayAfter.getFullYear(), dayAfter.getMonth(), dayAfter.getDate(), 23, 59, 0).toISOString();

  return [
    {
      id: generateId(),
      user_id: userId,
      title: 'Review Chapter 4: Neural Networks & Activation Functions',
      description: 'Go over lecture slides, implement ReLU and Softmax calculations in Python.',
      subject: 'Computer Science',
      task_type: 'study',
      priority: 'high',
      status: 'pending',
      deadline: todayIso,
      estimated_minutes: 45,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      user_id: userId,
      title: 'Calculus: Solve Spivak Problem Set 6',
      description: 'Complete questions 12 to 24 focusing on multivariable differentiation and gradients.',
      subject: 'Mathematics',
      task_type: 'homework',
      priority: 'medium',
      status: 'in_progress',
      deadline: tomorrowIso,
      estimated_minutes: 60,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: generateId(),
      user_id: userId,
      title: 'Physics Lab: Wave Optics & Double Slit Experiment',
      description: 'Prepare lab report with calculated fringe widths and interference pattern diagrams.',
      subject: 'Physics',
      task_type: 'assignment',
      priority: 'medium',
      status: 'completed',
      deadline: dayAfterIso,
      estimated_minutes: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
};

let isProcessingQueue = false;

export const storage = {
  // ==========================================
  // ONLINE & SYNC QUEUE MANAGEMENT
  // ==========================================
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  },

  getSyncQueue(userId?: string): SyncQueueItem[] {
    const key = getStorageKey('sync_queue', userId);
    return readStorage<SyncQueueItem[]>(key, []);
  },

  enqueueSync(item: Omit<SyncQueueItem, 'id' | 'timestamp'>, userId?: string): void {
    const key = getStorageKey('sync_queue', userId);
    const queue = this.getSyncQueue(userId);
    const newItem: SyncQueueItem = {
      ...item,
      id: generateId(),
      timestamp: Date.now(),
    };
    writeStorage(key, [...queue, newItem]);
    this.notifySyncChange(userId);

    // If online, trigger background drain
    if (this.isOnline()) {
      this.processSyncQueue(userId);
    }
  },

  clearSyncQueue(userId?: string): void {
    const key = getStorageKey('sync_queue', userId);
    writeStorage(key, []);
    this.notifySyncChange(userId);
  },

  async processSyncQueue(userId?: string): Promise<{ success: number; failed: number }> {
    if (isProcessingQueue || !this.isOnline()) {
      return { success: 0, failed: 0 };
    }

    const key = getStorageKey('sync_queue', userId);
    const queue = this.getSyncQueue(userId);
    if (queue.length === 0) return { success: 0, failed: 0 };

    isProcessingQueue = true;
    this.notifySyncChange(userId, true);

    const remaining: SyncQueueItem[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of queue) {
      try {
        if (item.action === 'CREATE_TASK') {
          await api.post('/api/tasks', item.payload);
        } else if (item.action === 'UPDATE_TASK') {
          await api.put(`/api/tasks/${item.payload.id}`, item.payload.updates);
        } else if (item.action === 'DELETE_TASK') {
          await api.delete(`/api/tasks/${item.payload.id}`);
        } else if (item.action === 'BATCH_TASKS') {
          await api.post('/api/tasks/batch', { tasks: item.payload }).catch(() => {
            return Promise.all(item.payload.map((t: any) => api.post('/api/tasks', t)));
          });
        } else if (item.action === 'CREATE_SESSION') {
          await api.post('/api/study-sessions', item.payload);
        } else if (item.action === 'CREATE_PLAN') {
          await api.post('/api/study-plans', item.payload);
        }
        successCount++;
      } catch (err: any) {
        // If 404 on update/delete or duplicate, don't block queue
        if (err?.status === 404 || err?.response?.status === 404) {
          successCount++;
        } else {
          remaining.push(item);
          failedCount++;
        }
      }
    }

    writeStorage(key, remaining);
    if (remaining.length === 0) {
      localStorage.setItem(getStorageKey('last_synced_at', userId), new Date().toISOString());
    }

    isProcessingQueue = false;
    this.notifySyncChange(userId, false);
    return { success: successCount, failed: failedCount };
  },

  notifySyncChange(userId?: string, syncing: boolean = isProcessingQueue): void {
    if (typeof window === 'undefined') return;
    const queue = this.getSyncQueue(userId);
    const lastSynced = localStorage.getItem(getStorageKey('last_synced_at', userId));
    const event = new CustomEvent('studyflow_sync_status', {
      detail: {
        isOnline: this.isOnline(),
        pendingCount: queue.length,
        isSyncing: syncing,
        lastSyncedAt: lastSynced,
      },
    });
    window.dispatchEvent(event);
  },

  // ==========================================
  // TASKS (LOCAL-FIRST WITH OFFLINE QUEUE)
  // ==========================================
  getTasks(userId?: string): Task[] {
    const key = getStorageKey('tasks', userId);
    let tasks = readStorage<Task[]>(key, []);
    
    // If first time or empty, initialize with welcoming default tasks
    if (tasks.length === 0) {
      const initialized = localStorage.getItem(`studyflow_tasks_initialized_${userId || 'guest'}`);
      if (!initialized) {
        tasks = createDefaultTasks(userId);
        writeStorage(key, tasks);
        localStorage.setItem(`studyflow_tasks_initialized_${userId || 'guest'}`, 'true');
      }
    }
    return tasks;
  },

  getTaskById(id: string, userId?: string): Task | null {
    const tasks = this.getTasks(userId);
    return tasks.find(t => t.id === id) || null;
  },

  saveTask(taskData: Partial<Task>, userId?: string): Task {
    const key = getStorageKey('tasks', userId);
    const tasks = this.getTasks(userId);
    const now = new Date().toISOString();

    const newTask: Task = {
      id: taskData.id || generateId(),
      user_id: userId || 'local_user',
      title: taskData.title || 'Untitled Task',
      description: taskData.description || '',
      subject: taskData.subject || 'General',
      task_type: taskData.task_type || 'study',
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      deadline: taskData.deadline || null,
      estimated_minutes: taskData.estimated_minutes || null,
      created_at: now,
      updated_at: now,
    };

    const updated = [newTask, ...tasks];
    writeStorage(key, updated);

    // Queue for sync when online
    this.enqueueSync({ action: 'CREATE_TASK', payload: newTask }, userId);
    return newTask;
  },

  updateTask(id: string, updates: Partial<Task>, userId?: string): Task | null {
    const key = getStorageKey('tasks', userId);
    const tasks = this.getTasks(userId);
    const now = new Date().toISOString();

    let updatedTask: Task | null = null;
    const nextTasks = tasks.map(t => {
      if (t.id === id) {
        updatedTask = {
          ...t,
          ...updates,
          updated_at: now,
        };
        return updatedTask;
      }
      return t;
    });

    if (updatedTask) {
      writeStorage(key, nextTasks);
      // Queue update for sync when online
      this.enqueueSync({ action: 'UPDATE_TASK', payload: { id, updates } }, userId);
    }

    return updatedTask;
  },

  deleteTask(id: string, userId?: string): boolean {
    const key = getStorageKey('tasks', userId);
    const tasks = this.getTasks(userId);
    const nextTasks = tasks.filter(t => t.id !== id);
    writeStorage(key, nextTasks);

    // Queue delete for sync when online
    this.enqueueSync({ action: 'DELETE_TASK', payload: { id } }, userId);
    return true;
  },

  saveBatchTasks(newTasksData: Partial<Task>[], userId?: string): Task[] {
    const key = getStorageKey('tasks', userId);
    const existing = this.getTasks(userId);
    const now = new Date().toISOString();

    const createdList: Task[] = newTasksData.map(data => ({
      id: data.id || generateId(),
      user_id: userId || 'local_user',
      title: data.title || 'Untitled Task',
      description: data.description || '',
      subject: data.subject || 'General',
      task_type: data.task_type || 'study',
      priority: data.priority || 'medium',
      status: data.status || 'pending',
      deadline: data.deadline || null,
      estimated_minutes: data.estimated_minutes || 45,
      created_at: now,
      updated_at: now,
    }));

    const combined = [...createdList, ...existing];
    writeStorage(key, combined);

    // Queue batch for cloud sync when online
    this.enqueueSync({ action: 'BATCH_TASKS', payload: createdList }, userId);
    return createdList;
  },

  // ==========================================
  // STUDY PLANS
  // ==========================================
  getStudyPlans(userId?: string): StudyPlan[] {
    const key = getStorageKey('study_plans', userId);
    return readStorage<StudyPlan[]>(key, []);
  },

  getActiveStudyPlan(userId?: string): StudyPlan | null {
    const plans = this.getStudyPlans(userId);
    return plans.length > 0 ? plans[0] : null;
  },

  saveStudyPlan(planData: Partial<StudyPlan>, userId?: string): StudyPlan {
    const key = getStorageKey('study_plans', userId);
    const existing = this.getStudyPlans(userId);
    const now = new Date().toISOString();

    const newPlan: StudyPlan = {
      id: planData.id || generateId(),
      user_id: userId || 'local_user',
      title: planData.title || 'Study Schedule',
      description: planData.description || '',
      start_date: planData.start_date || new Date().toISOString().split('T')[0],
      end_date: planData.end_date || new Date().toISOString().split('T')[0],
      total_minutes: planData.total_minutes || 0,
      plan_data: planData.plan_data!,
      created_at: now,
      updated_at: now,
    };

    const updated = [newPlan, ...existing];
    writeStorage(key, updated);

    this.enqueueSync({ action: 'CREATE_PLAN', payload: newPlan }, userId);
    return newPlan;
  },

  // ==========================================
  // STUDY SESSIONS
  // ==========================================
  getStudySessions(userId?: string): StudySession[] {
    const key = getStorageKey('sessions', userId);
    return readStorage<StudySession[]>(key, []);
  },

  saveStudySession(sessionData: Partial<StudySession>, userId?: string): StudySession {
    const key = getStorageKey('sessions', userId);
    const existing = this.getStudySessions(userId);
    const now = new Date().toISOString();

    const newSession: StudySession = {
      id: sessionData.id || generateId(),
      user_id: userId || 'local_user',
      task_id: sessionData.task_id || null,
      study_plan_id: sessionData.study_plan_id || null,
      subject: sessionData.subject || 'General Study',
      duration_minutes: sessionData.duration_minutes || 30,
      completed_at: sessionData.completed_at || now,
      created_at: now,
    };

    const updated = [newSession, ...existing];
    writeStorage(key, updated);

    this.enqueueSync({ action: 'CREATE_SESSION', payload: newSession }, userId);
    return newSession;
  },

  // ==========================================
  // QUIZZES
  // ==========================================
  getQuizzes(userId?: string): Quiz[] {
    const key = getStorageKey('quizzes', userId);
    return readStorage<Quiz[]>(key, []);
  },

  saveQuiz(quizData: Partial<Quiz>, userId?: string): Quiz {
    const key = getStorageKey('quizzes', userId);
    const existing = this.getQuizzes(userId);
    const now = new Date().toISOString();

    const newQuiz: Quiz = {
      id: quizData.id || generateId(),
      user_id: userId || 'local_user',
      topic: quizData.topic || 'General Topic',
      difficulty: quizData.difficulty || 'medium',
      questions: quizData.questions || [],
      score: quizData.score ?? null,
      total_questions: quizData.total_questions || quizData.questions?.length || 5,
      created_at: now,
    };

    const updated = [newQuiz, ...existing];
    writeStorage(key, updated);

    if (this.isOnline()) {
      api.post('/api/quizzes', newQuiz).catch(() => {});
    }

    return newQuiz;
  },

  updateQuizScore(id: string, score: number, userId?: string): Quiz | null {
    const key = getStorageKey('quizzes', userId);
    const quizzes = this.getQuizzes(userId);
    let updatedQuiz: Quiz | null = null;

    const nextQuizzes = quizzes.map(q => {
      if (q.id === id) {
        updatedQuiz = { ...q, score };
        return updatedQuiz;
      }
      return q;
    });

    if (updatedQuiz) {
      writeStorage(key, nextQuizzes);
      if (this.isOnline()) {
        api.put(`/api/quizzes/${id}/score`, { score }).catch(() => {});
      }
    }

    return updatedQuiz;
  },

  // ==========================================
  // BACKUP & RESTORE UTILITIES
  // ==========================================
  exportAllData(userId?: string): string {
    const data = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(userId),
      studyPlans: this.getStudyPlans(userId),
      sessions: this.getStudySessions(userId),
      quizzes: this.getQuizzes(userId),
      pendingSyncQueue: this.getSyncQueue(userId),
    };
    return JSON.stringify(data, null, 2);
  },

  importAllData(jsonString: string, userId?: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.tasks)) {
        writeStorage(getStorageKey('tasks', userId), data.tasks);
      }
      if (Array.isArray(data.studyPlans)) {
        writeStorage(getStorageKey('study_plans', userId), data.studyPlans);
      }
      if (Array.isArray(data.sessions)) {
        writeStorage(getStorageKey('sessions', userId), data.sessions);
      }
      if (Array.isArray(data.quizzes)) {
        writeStorage(getStorageKey('quizzes', userId), data.quizzes);
      }
      return true;
    } catch (err) {
      console.error('[StudyFlow Storage] Import failed:', err);
      return false;
    }
  },

  getStorageStats(userId?: string) {
    const tasks = this.getTasks(userId);
    const plans = this.getStudyPlans(userId);
    const sessions = this.getStudySessions(userId);
    const quizzes = this.getQuizzes(userId);
    const queue = this.getSyncQueue(userId);

    return {
      taskCount: tasks.length,
      planCount: plans.length,
      sessionCount: sessions.length,
      quizCount: quizzes.length,
      pendingSyncCount: queue.length,
      isOnline: this.isOnline(),
    };
  }
};

// Global network listener to automatically process queue when online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    storage.notifySyncChange();
    storage.processSyncQueue();
  });
  window.addEventListener('offline', () => {
    storage.notifySyncChange();
  });
}
