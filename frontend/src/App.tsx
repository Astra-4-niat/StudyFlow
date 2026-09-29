import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { InstallPrompt } from './components/common/InstallPrompt';

// Route-based code-splitting: loads each page chunk on demand for ultra-fast initial load
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const SignUp = lazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const TaskDetail = lazy(() => import('./pages/TaskDetail').then(m => ({ default: m.TaskDetail })));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner').then(m => ({ default: m.StudyPlanner })));
const AICopilot = lazy(() => import('./pages/AICopilot').then(m => ({ default: m.AICopilot })));
const QuizGenerator = lazy(() => import('./pages/QuizGenerator').then(m => ({ default: m.QuizGenerator })));
const Progress = lazy(() => import('./pages/Progress').then(m => ({ default: m.Progress })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));

const PageLoader: React.FC = () => (
  <div className="loading-fullscreen">
    <div className="loading-spinner loading-spinner--sm" />
    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading StudyFlow AI...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const AppRoutes: React.FC = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/:id" element={<TaskDetail />} />
        <Route path="planner" element={<StudyPlanner />} />
        <Route path="study-planner" element={<Navigate to="/planner" replace />} />
        <Route path="copilot" element={<AICopilot />} />
        <Route path="ai-copilot" element={<Navigate to="/copilot" replace />} />
        <Route path="quiz" element={<QuizGenerator />} />
        <Route path="progress" element={<Progress />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' },
          }}
        />
        <AppRoutes />
        <InstallPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
