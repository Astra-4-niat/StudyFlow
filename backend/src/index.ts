import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { taskRoutes } from './routes/tasks';
import { studyPlanRoutes } from './routes/studyPlans';
import { studySessionRoutes } from './routes/studySessions';
import { quizRoutes } from './routes/quizzes';
import { aiRoutes } from './routes/ai';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

dotenv.config();

// Safe validation of required environment configuration without printing secret values
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Critical: Missing Supabase environment variables');
} else {
  console.log('✅ Supabase configuration loaded');
}

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Critical: Missing Gemini API key');
} else {
  console.log('✅ Gemini configuration loaded');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(morgan('dev'));

// CORS - allow frontend origin
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || process.env.NODE_ENV === 'production') {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Health check
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configured: {
      supabase: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder-key')
    }
  });
});

// Public auth routes (signup, login)
app.use('/api/auth', authRoutes);

// Protected routes - require auth
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/study-plans', authMiddleware, studyPlanRoutes);
app.use('/api/study-sessions', authMiddleware, studySessionRoutes);
app.use('/api/quizzes', authMiddleware, quizRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// Error handler (must be last)
app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`✅ StudyFlow AI Backend running on port ${PORT}`);
  });
}

// Support both CommonJS and ES module consumers on Vercel
module.exports = app;
export default app;
