# StudyFlow AI 🎓✨

<p align="center">
  <img src="frontend/public/icons/studyflow-logo.png" alt="StudyFlow AI Logo" width="100" height="100" style="border-radius: 22px; box-shadow: 0 8px 30px rgba(56, 189, 248, 0.3);" />
</p>

<p align="center">
  <strong>An Apple-Inspired Academic Command Center with Offline-First Architecture & Cloud Sync.</strong><br>
  Plan smarter, revise faster, track progress, and learn without limits — online or completely offline.
</p>

<p align="center">
  <a href="https://studyflowve.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-studyflowve.vercel.app-00f2fe?style=for-the-badge&logo=vercel" alt="Live Demo"></a>
  <img src="https://img.shields.io/badge/PWA-Android%20%26%20iOS%20Ready-success?style=for-the-badge&logo=android" alt="PWA Ready">
  <img src="https://img.shields.io/badge/Offline-100%25%20Functional-blueviolet?style=for-the-badge&logo=buffer" alt="Offline Ready">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini%201.5-blue?style=for-the-badge&logo=google" alt="Google Gemini AI">
  <img src="https://img.shields.io/badge/Database-Supabase%20Postgres-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase">
</p>

---

## 🌟 Highlights & Capabilities

### ⚡ 1. 100% Offline-First Architecture & Zero-Latency Local Storage
* **Runs in Airplane Mode:** Uses service worker precaching (`studyflow-offline-v2`) to load the application shell, pages, styles, and assets with 0 network dependencies.
* **Instant Device Storage:** All tasks, study sessions, study plans, and quizzes are stored locally in the device's storage for instant **0ms load times**.
* **Automatic Cloud Sync Queue:** Any modifications made offline (task creates, updates, deletes, study sessions) are safely enqueued in a persistent queue (`studyflow_sync_queue`).
* **Auto-Replay on Reconnection:** The moment your phone or computer reconnects to the internet (`window.online`), queued mutations replay seamlessly to Supabase in the background.
* **Sync Status Indicator:** Real-time UI indicator showing Synced (🟢), Offline Mode with pending mutation count (🟡), and Syncing live animation (🔵) with a one-click **"Sync Now"** trigger.

### 💾 2. Local Backup & Instant Restore (.json)
* **One-Click Export:** Download a complete, unencrypted JSON backup of all your tasks, study logs, quizzes, and schedules directly to your device.
* **Offline Restore:** Import and restore backup files at any time, even without an internet connection or backend access.

### 🧠 3. Google Gemini 1.5 Academic Intelligence
* **AI Study Planner:** Transforms your exam dates, available daily hours, and subject goals into realistic, day-by-day milestone schedules.
* **AI Copilot:** Context-aware academic conversational assistant with knowledge of your active deadlines and courses.
* **Quiz Generator:** Generates 5–10 interactive multiple-choice questions with instant scoring and explanations for any subject or topic.
* **AI Task Breakdown:** Splits intimidating assignments into step-by-step actionable micro-tasks.
* **Graceful Offline Safeguards:** Normal productivity features remain completely unblocked offline, while AI features gracefully notify the user that AI generation requires an internet connection.

### 📱 4. Installable Android & Mobile Web App (PWA / WebAPK)
* **Installable Native App Feel:** Add to Home Screen on Android and iOS with dedicated launcher icon, full-screen standalone mode, and bottom navigation bar.
* **No App Store Friction:** Install directly from Google Chrome or Safari via the built-in install banner.

### 🛡️ 5. Zero-Email Dependency Security & Password Recovery
* **Dual Password Recovery:** Reset your password via email link OR instantly through your personal **Security Question & Answer**, ensuring you never get locked out even if email delivery is delayed.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router DOM, Lucide Icons, Recharts, React Hot Toast |
| **Styling** | Apple-inspired minimal dark UI/UX system, Custom responsive CSS variables, Glassmorphism, Micro-animations |
| **Offline & Storage** | Service Workers (PWA Cache Storage), Persistent Sync Queue, Local Device Storage, Blob File I/O |
| **Backend** | Node.js, Express.js, TypeScript, Zod Schema Validation, Vercel Serverless Function (`/api`) |
| **AI Integration** | Google Generative AI (`@google/generative-ai`), Gemini 1.5 Flash |
| **Database & Auth** | Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth (JWT) |
| **Deployment** | Vercel (Frontend & Serverless API), GitHub CI/CD |

---

## 🏛 Architecture Overview

```
                                  STUDYFLOW AI
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
        [ONLINE MODE]                                 [OFFLINE MODE]
                │                                             │
      Fast Local Read/Write                         Instant Local Storage (0ms)
                │                                             │
      Real-Time Cloud Sync                         Persistent Mutation Sync Queue
                │                                             │
      Gemini 1.5 AI Endpoints                       Local Precached PWA Shell
                │                                             │
       Supabase PostgreSQL                        Background Sync on Reconnect ──┐
                ▲                                                                 │
                └────────────────────────── Replays Queue ────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Supabase Account & Project](https://supabase.com)
* [Google AI Studio API Key](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository
```bash
git clone https://github.com/shreyash-bhosale/StudyFlow.git
cd StudyFlow
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 3. Setup Environment Variables

#### Backend (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-google-gemini-api-key
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

### 4. Database Setup
1. Go to your Supabase Project Dashboard → **SQL Editor**.
2. Run the SQL script located in [`supabase-schema.sql`](./supabase-schema.sql).
3. Tables created:
   * `profiles` (with security question & answer recovery fields)
   * `tasks` (priorities, subjects, deadlines, completion)
   * `study_plans` (AI-generated schedules)
   * `study_sessions` (Pomodoro and revision logs)
   * `quizzes` (questions, answers, scores)

### 5. Run Locally
```bash
# Run both frontend & backend concurrently from root:
npm run dev

# Or run individually:
npm run dev:backend   # API on http://localhost:3001
npm run dev:frontend  # UI on http://localhost:5173
```

---

## 📱 Installing on Android / iOS

1. Open **[studyflowve.vercel.app](https://studyflowve.vercel.app)** in Google Chrome on your phone.
2. Tap the **"Install StudyFlow AI App"** banner at the bottom (or tap Chrome's `⋮` menu → **"Install app"** or **"Add to Home screen"**).
3. The app will be installed to your device launcher as a native WebAPK with full offline launch capabilities.

---

## 🔒 Security & Privacy

* 🛡️ **Zero API Key Leakage:** The Google Gemini API key is strictly stored server-side in environment variables and never bundled or transmitted to client devices.
* 🔐 **Row-Level Security (RLS):** Supabase RLS policies enforce that users can only read and write their own rows.
* 🛡️ **Zod Validation:** All API endpoints validate request structures before processing.
* 🛡️ **Local Privacy:** Backup files (`.json`) are downloaded directly into device memory via local blobs without passing through intermediate analytics or servers.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  Designed & Engineered with ❤️ for ambitious students worldwide.
</p>
