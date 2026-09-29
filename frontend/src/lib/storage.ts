import { Task, StudyPlan, StudySession, Quiz } from '../types';
import api from './api';

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

export const storage = {
  // ==========================================
  // TASKS
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

    // Silent background sync to backend if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      api.post('/api/tasks', newTask).catch(() => {
        // Safe to ignore: stored on device locally
      });
    }

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

      // Silent background sync
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        api.put(`/api/tasks/${id}`, updates).catch(() => {
          // Stored on device locally
        });
      }
    }

    return updatedTask;
  },

  deleteTask(id: string, userId?: string): boolean {
    const key = getStorageKey('tasks', userId);
    const tasks = this.getTasks(userId);
    const nextTasks = tasks.filter(t => t.id !== id);
    writeStorage(key, nextTasks);

    // Silent background sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      api.delete(`/api/tasks/${id}`).catch(() => {});
    }

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

    // Silent background sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      api.post('/api/tasks/batch', { tasks: createdList }).catch(() => {
        // Fallback per-item sync
        createdList.forEach(t => api.post('/api/tasks', t).catch(() => {}));
      });
    }

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

    // Silent background sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      api.post('/api/study-plans', newPlan).catch(() => {});
    }

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

    // Silent background sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      api.post('/api/study-sessions', newSession).catch(() => {});
    }

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

    // Silent background sync
    if (typeof navigator !== 'undefined' && navigator.onLine) {
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
      if (typeof navigator !== 'undefined' && navigator.onLine) {
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

    return {
      taskCount: tasks.length,
      planCount: plans.length,
      sessionCount: sessions.length,
      quizCount: quizzes.length,
    };
  }
};
