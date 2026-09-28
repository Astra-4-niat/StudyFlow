# StudyFlow AI 🎓

> **An AI-powered academic command center** — Plan smarter, learn better, achieve more.

StudyFlow AI is a full-stack web application that helps students manage tasks, generate personalized study plans with Google Gemini AI, take AI-generated quizzes, and track academic progress.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Task Management** | Full CRUD — create, edit, complete, delete tasks with priorities & deadlines |
| **AI Study Planner** | Gemini AI generates day-by-day study plans from your goal and exam date |
| **AI Copilot** | Chat with a context-aware AI assistant that knows your tasks |
| **Quiz Generator** | AI-generated multiple-choice quizzes on any topic with scoring |
| **AI Task Breakdown** | Break any task into actionable steps with Gemini AI |
| **Progress Tracking** | Charts for study time, task completion, and subject distribution |
| **Study Sessions** | Log study sessions tracked against real Supabase data |
| **Authentication** | Supabase Auth — signup, login, logout, password change |
| **Row Level Security** | Each user can only access their own data |

---

## 🛠 Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **React Router DOM** for routing
- **Recharts** for data visualization
- **Lucide React** for icons
- **React Hot Toast** for notifications
- **Supabase JS** for auth

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **Google Generative AI SDK** (@google/generative-ai)
- **Supabase Admin Client** for secure DB access
- **Zod** for input validation
- **Helmet** + **CORS** + **Rate Limiting** for security

### Database & Auth
- **Supabase PostgreSQL** (fully managed)
- **Supabase Auth** (JWT-based)
- **Row Level Security** on all tables

---

## 🏗 Architecture

```
Browser (React)
    │
    ├── Supabase Auth (JWT)
    │
    └── Express Backend (Node.js)
             │
             ├── Supabase PostgreSQL (via service role key)
             └── Google Gemini API (secure, server-side only)
```

**Security**: The Gemini API key is **never** sent to the browser. All AI calls happen server-side.

---

## 🗄 Database Schema

```sql
profiles     — user profile info
tasks        — academic tasks with priority/deadline/status
study_plans  — AI-generated study plans (JSONB)
study_sessions — tracked study time by subject
quizzes      — AI quiz questions and scores (JSONB)
```

See [`supabase-schema.sql`](./supabase-schema.sql) for the complete schema with RLS policies.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # For admin DB access
GEMINI_API_KEY=your-gemini-api-key                  # NEVER expose to frontend
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google Gemini API key

### Step 1: Clone & Install
```bash
git clone <repo-url>
cd studyflow-ai
npm install          # installs root devDependencies (concurrently)
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Configure Environment
```bash
# Copy example files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Fill in your actual credentials
```

### Step 3: Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a project
2. Open the **SQL Editor**
3. Run the contents of [`supabase-schema.sql`](./supabase-schema.sql)
4. Copy your **Project URL** and **anon key** from Settings → API

### Step 4: Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to `backend/.env` as `GEMINI_API_KEY`

### Step 5: Run
```bash
# From project root - runs both frontend and backend
npm run dev

# Or run separately:
npm run dev:backend   # Backend on :3001
npm run dev:frontend  # Frontend on :5173
```

---

## ☁️ Replit Deployment

1. **Fork/upload** this project to Replit
2. Add all environment variables in **Replit Secrets**:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `FRONTEND_URL` = your Replit app URL
   - `NODE_ENV=production`
3. Set `VITE_API_URL` to your backend Replit URL
4. Build: `npm run build`
5. Start: `npm run start`

For SPA routing to work in production, configure your server to serve `index.html` for all unmatched routes (already handled in the Express server).

---

## 🔒 Security

- ✅ Gemini API key never sent to browser
- ✅ All AI requests go through authenticated backend endpoints
- ✅ Supabase Row Level Security — users can only access their own data
- ✅ Server-side JWT verification (not frontend filtering)
- ✅ Input validation with Zod on all endpoints
- ✅ Rate limiting on AI endpoints (20 req/15min)
- ✅ Helmet for security headers
- ✅ CORS configured for specific origins only

---

## 📁 Project Structure

```
studyflow-ai/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server
│   │   ├── lib/supabase.ts   # Supabase admin client
│   │   ├── middleware/
│   │   │   ├── auth.ts       # JWT verification
│   │   │   └── errorHandler.ts
│   │   └── routes/
│   │       ├── tasks.ts      # Task CRUD
│   │       ├── studyPlans.ts
│   │       ├── studySessions.ts
│   │       ├── quizzes.ts
│   │       └── ai.ts         # All Gemini AI routes
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # All page components
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # Auth context
│   │   ├── lib/              # Supabase & API clients
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # Helper functions
│   └── package.json
├── supabase-schema.sql       # Run this in Supabase SQL Editor
├── package.json              # Root scripts
└── README.md
```

---

## 🔮 Future Improvements

- [ ] Dark/light mode toggle
- [ ] AI-powered task prioritization notifications
- [ ] Calendar view for deadlines
- [ ] Export study plans as PDF
- [ ] Collaboration features
- [ ] Mobile native app (React Native)
- [ ] Pomodoro timer integration
- [ ] Google Calendar sync

---

*Built with ❤️ using React, Node.js, Supabase, and Google Gemini AI*
