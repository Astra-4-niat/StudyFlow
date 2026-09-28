-- ==============================================================================
-- STUDYFLOW AI — COMPLETE DATABASE MIGRATION SCRIPT
-- Execute in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Safe & Idempotent: Can be run multiple times safely without errors.
-- ==============================================================================

-- 1. Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. CREATE APPLICATION TABLES
-- ==============================================================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  task_type TEXT NOT NULL DEFAULT 'assignment' CHECK (task_type IN ('assignment', 'exam', 'project', 'homework', 'study')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  deadline TIMESTAMPTZ,
  estimated_minutes INTEGER CHECK (estimated_minutes >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STUDY PLANS TABLE
CREATE TABLE IF NOT EXISTS public.study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_minutes INTEGER DEFAULT 0,
  plan_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- STUDY SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  study_plan_id UUID REFERENCES public.study_plans(id) ON DELETE SET NULL,
  subject TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  completed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- QUIZZES TABLE
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions JSONB NOT NULL DEFAULT '[]',
  score INTEGER CHECK (score >= 0),
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ==============================================================================
-- 3. CREATE PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS study_plans_user_id_idx ON public.study_plans(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx ON public.study_sessions(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_completed_at_idx ON public.study_sessions(completed_at);
CREATE INDEX IF NOT EXISTS quizzes_user_id_idx ON public.quizzes(user_id);

-- ==============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. RLS POLICIES (Idempotent: DROP before CREATE)
-- ==============================================================================

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- TASKS POLICIES
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- STUDY PLANS POLICIES
DROP POLICY IF EXISTS "Users can view their own study plans" ON public.study_plans;
CREATE POLICY "Users can view their own study plans"
  ON public.study_plans FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own study plans" ON public.study_plans;
CREATE POLICY "Users can insert their own study plans"
  ON public.study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own study plans" ON public.study_plans;
CREATE POLICY "Users can update their own study plans"
  ON public.study_plans FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own study plans" ON public.study_plans;
CREATE POLICY "Users can delete their own study plans"
  ON public.study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- STUDY SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can view their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can view their own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can insert their own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own study sessions" ON public.study_sessions;
CREATE POLICY "Users can delete their own study sessions"
  ON public.study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- QUIZZES POLICIES
DROP POLICY IF EXISTS "Users can view their own quizzes" ON public.quizzes;
CREATE POLICY "Users can view their own quizzes"
  ON public.quizzes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quizzes" ON public.quizzes;
CREATE POLICY "Users can insert their own quizzes"
  ON public.quizzes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quizzes" ON public.quizzes;
CREATE POLICY "Users can update their own quizzes"
  ON public.quizzes FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own quizzes" ON public.quizzes;
CREATE POLICY "Users can delete their own quizzes"
  ON public.quizzes FOR DELETE
  USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. AUTOMATIC TIMESTAMPS & USER TRIGGERS
-- ==============================================================================

-- Function to automatically refresh updated_at on record update
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_study_plans_updated_at ON public.study_plans;
CREATE TRIGGER update_study_plans_updated_at
  BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-provision profile record when a user is confirmed in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
