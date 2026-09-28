export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  subject: string;
  task_type: 'assignment' | 'exam' | 'project' | 'homework' | 'study';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  deadline: string | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  total_minutes: number;
  plan_data: AIStudyPlan;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  task_id: string | null;
  study_plan_id: string | null;
  subject: string;
  duration_minutes: number;
  completed_at: string;
  created_at: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  score: number | null;
  total_questions: number;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface AIStudyPlan {
  title: string;
  summary: string;
  totalDays: number;
  totalMinutes: number;
  days: StudyDay[];
}

export interface StudyDay {
  date: string;
  dayNumber: number;
  focus: string;
  totalMinutes: number;
  activities: StudyActivity[];
}

export interface StudyActivity {
  title: string;
  subject: string;
  type: 'study' | 'review' | 'practice' | 'break';
  duration: number;
  description: string;
}

export interface TaskBreakdown {
  taskTitle: string;
  steps: BreakdownStep[];
  totalEstimatedMinutes: number;
  advice: string;
}

export interface BreakdownStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  tips: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface PrioritizedTask {
  taskTitle: string;
  rank: number;
  reason: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}
