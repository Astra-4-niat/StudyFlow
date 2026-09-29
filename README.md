StudyFlow AI 🎓✨

<p align="center">
  <img src="frontend/public/icons/studyflow-logo.png" alt="StudyFlow AI Logo" width="100" height="100" />
</p>

<h3 align="center">An AI-powered academic command center built for modern students.</h3>

<p align="center">
  Plan smarter. Study better. Track progress. Learn with AI.
</p>

<p align="center">
  <a href="https://studyflowve.vercel.app">
    <img src="https://img.shields.io/badge/Live%20Demo-StudyFlow%20AI-7C5CFC?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/shreyash-bhosale/StudyFlow">
    <img src="https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repository" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
</p>

📌 Overview

StudyFlow AI is a full-stack AI-powered study management platform designed to help students organize academic work, create personalized study plans, test their knowledge, and monitor progress from one place.

Instead of using separate tools for assignments, study schedules, revision, quizzes, and academic assistance, StudyFlow brings these workflows together into a single command center.

The application combines:

📋 Task management

🤖 AI academic assistance

🧠 AI-generated quizzes

📅 Personalized study planning

⏱️ Study-session tracking

📊 Progress insights

🔐 Authentication

☁️ Supabase-backed persistence

📱 Responsive/PWA-oriented experience

⚡ Production deployment on Vercel

Live application: studyflowve.vercel.app

✨ Core Features

1. 📋 Smart Task Management

Create and manage academic tasks with useful metadata.

Supported workflows

Create tasks

Edit tasks

Delete tasks

Mark tasks as completed

Assign subjects/categories

Set priorities

Add deadlines

Track active and completed work

View today's focus

View upcoming deadlines

The dashboard automatically turns task data into useful academic summaries.

2. 🤖 AI Copilot

StudyFlow includes an AI-powered academic assistant backed by Google Gemini.

The Copilot can help students with:

Concept explanations

Study guidance

Academic questions

Revision assistance

Planning suggestions

Context-aware academic support

The application keeps normal productivity functionality separate from AI functionality so that AI-related failures do not prevent users from managing their academic data.

3. 🧠 AI Quiz Generator

Generate interactive quizzes from a selected subject or topic.

Quiz workflow

Enter a subject/topic.

Select the desired difficulty/settings.

Generate questions using Gemini.

Attempt the quiz.

Receive a score.

Review answers and explanations.

Store quiz data for later reference.

This turns StudyFlow from a simple task manager into a revision and self-assessment platform.

4. 📅 AI Study Planner

StudyFlow can generate structured study plans based on academic requirements.

The planner can use information such as:

Subjects

Topics

Exam dates

Available study time

Priorities

Academic goals

The generated plan is converted into actionable study milestones instead of leaving the student with a generic AI response.

5. 🧩 AI Task Breakdown

Large assignments can be difficult to approach.

StudyFlow can use AI to break a larger task into smaller milestones and actionable steps.

Example:

Build a Python project
        ↓
1. Define requirements
2. Design the project structure
3. Implement core functionality
4. Add validation
5. Test the application
6. Fix issues
7. Document the project

This helps transform large academic goals into manageable actions.

6. ⏱️ Study Session Tracking

Students can record study sessions and monitor how much time they are actually spending on academic work.

Tracked information can contribute to:

Study-time summaries

Progress insights

Dashboard statistics

Personal productivity analysis

7. 📊 Progress Dashboard

The dashboard provides an overview of academic activity.

Example metrics

Total tasks

Active tasks

Completed tasks

Completion rate

Upcoming deadlines

Study time

Today's focus

Recent academic activity

The goal is to make important academic information visible without forcing students to navigate through multiple screens.

8. 🔐 Authentication & User Data

StudyFlow supports authenticated user workflows.

User-specific academic data is stored separately so that each account can access its own:

Tasks

Study plans

Study sessions

Quizzes

Profile information

Supabase authentication and PostgreSQL persistence are used as the foundation for the data layer.

📴 Offline-First Experience

StudyFlow is designed with offline usability in mind for core productivity workflows.

Offline capabilities

Local application shell caching

Local task/data access

Persistent synchronization queue

Offline mutation tracking

Automatic synchronization after reconnection

Manual sync controls

Offline-friendly productivity workflows

The application separates features that require the internet from features that can continue working locally.

Online / Offline flow

                    STUDYFLOW AI
                         │
             ┌───────────┴───────────┐
             │                       │
          ONLINE                   OFFLINE
             │                       │
      Supabase + Gemini        Local application data
             │                       │
      Cloud persistence        Persistent sync queue
             │                       │
             └───────────┬───────────┘
                         │
                   Reconnection
                         │
                         ▼
                 Queue synchronization

AI generation requires an internet connection because Gemini requests are performed through the backend.

💾 Backup & Restore

StudyFlow includes local backup functionality for supported academic data.

Export

Users can export application data into a JSON backup file.

Restore

A previously exported JSON backup can be imported to restore supported local data.

Example:

StudyFlow
   │
   ├── Tasks
   ├── Study Plans
   ├── Study Sessions
   └── Quizzes
          │
          ▼
      JSON Backup

Backups are intended to give users an additional way to preserve their academic data.

📱 PWA / Mobile Experience

StudyFlow is designed to provide an app-like experience on supported mobile browsers.

Depending on browser/platform support, users can add the application to their device's home screen.

Mobile experience

Responsive interface

Touch-friendly controls

Mobile navigation

Installable web-app experience

Standalone-style application experience

Offline application shell

🎨 UI / UX

StudyFlow follows an Apple-inspired dark interface focused on clarity and low visual clutter.

Design principles

Minimal visual hierarchy

Dark interface

Glass-inspired surfaces

Rounded components

Subtle borders

Consistent spacing

Responsive layouts

Micro-interactions

Smooth transitions

Clear typography

Accessible interaction states

The interface is designed to keep academic information readable while still providing a polished modern product experience.

🏗️ System Architecture

┌──────────────────────────────────────────────────────────────┐
│                         STUDYFLOW AI                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ React + TypeScript│
                    │      Frontend     │
                    └─────────┬─────────┘
                              │
                         REST API / Auth
                              │
                              ▼
                    ┌───────────────────┐
                    │ Express + Node.js │
                    │     Backend       │
                    └─────────┬─────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
                 ▼                         ▼
        ┌─────────────────┐       ┌─────────────────┐
        │ Supabase        │       │ Google Gemini   │
        │ PostgreSQL/Auth │       │ AI Services    │
        └─────────────────┘       └─────────────────┘

🗂️ Project Structure

StudyFlow/
│
├── api/
│   └── ...
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── ...
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   └── ...
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   └── ...
│   ├── package.json
│   └── vite.config.*
│
├── .agents/
│   └── rules/
│
├── package.json
├── package-lock.json
├── supabase-schema.sql
├── tsconfig.json
├── vercel.json
└── README.md

The exact internal file structure may evolve as the project develops.

🛠️ Tech Stack

Layer

Technology

Frontend

React 18

Language

TypeScript

Build Tool

Vite

Routing

React Router

UI Icons

Lucide

Charts

Recharts

Notifications

React Hot Toast

Styling

Custom CSS / responsive design

Backend

Node.js + Express

Backend Language

TypeScript

Validation

Zod

Database

Supabase PostgreSQL

Authentication

Supabase Auth / JWT

AI

Google Gemini API

Offline

Service Worker + local storage/sync mechanisms

Deployment

Vercel

Repository

GitHub

🚀 Getting Started

Prerequisites

Make sure you have:

Node.js 18+

npm

A Supabase project

A Google Gemini API key

Git

1. Clone the repository

git clone https://github.com/shreyash-bhosale/StudyFlow.git
cd StudyFlow

2. Install dependencies

Install root dependencies:

npm install

Install backend dependencies:

cd backend
npm install

Install frontend dependencies:

cd ../frontend
npm install

Return to the project root:

cd ..

🔐 Environment Variables

Backend

Create:

backend/.env

Example:

PORT=3001
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GEMINI_API_KEY=your-gemini-api-key

FRONTEND_URL=http://localhost:5173

Frontend

Create:

frontend/.env

Example:

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001

⚠️ Never commit secrets

Do not commit:

.env
.env.local
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY

The Supabase service-role key and Gemini API key must remain server-side.

🗄️ Database Setup

Create a Supabase project.

Open Supabase Dashboard → SQL Editor.

Open:

supabase-schema.sql

Copy the SQL into the Supabase SQL Editor.

Execute the script.

Verify that the required tables and policies have been created.

The project uses tables for core academic entities such as:

profiles
tasks
study_plans
study_sessions
quizzes

Database policies should be reviewed before using the application with production data.

💻 Run Locally

From the project root:

npm run dev

If the root project is configured to run both applications concurrently, this starts the frontend and backend together.

You can also run them separately.

Backend

npm run dev:backend

Typical development API:

http://localhost:3001

Frontend

npm run dev:frontend

Typical development frontend:

http://localhost:5173

🧪 Testing & Validation

Before deployment, validate both frontend and backend.

Frontend build

cd frontend
npm run build

Backend build

cd backend
npm run build

Recommended validation checklist

[ ] Authentication
[ ] Login
[ ] Logout
[ ] Task creation
[ ] Task editing
[ ] Task completion
[ ] Task deletion
[ ] Deadlines
[ ] Study planner
[ ] AI Copilot
[ ] Quiz generation
[ ] AI task breakdown
[ ] Study sessions
[ ] Progress dashboard
[ ] Offline workflows
[ ] Reconnection sync
[ ] Backup export
[ ] Backup restore
[ ] Mobile layout
[ ] Production environment variables
[ ] Production deployment

☁️ Production Deployment

StudyFlow is deployed using Vercel.

Production application:

https://studyflowve.vercel.app

The repository contains a Vercel configuration:

vercel.json

The deployment architecture separates the frontend and backend while routing API requests through the production application.

                   studyflowve.vercel.app
                            │
              ┌─────────────┴─────────────┐
              │                           │
           Frontend                    /api/*
              │                           │
              ▼                           ▼
           Vite UI                    Express API
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                          Supabase                 Gemini

Production environment variables

Configure production secrets in the Vercel project settings instead of committing them to Git.

Required values include the Supabase and Gemini configuration used by the backend and frontend.

🔒 Security

StudyFlow uses multiple layers of application security.

API key protection

Sensitive server-side credentials are stored in environment variables.

The Gemini API key should never be exposed in frontend code.

Supabase RLS

Row Level Security can restrict database access so authenticated users only access permitted records.

Input validation

Backend requests are validated using Zod where applicable.

Authentication

User authentication is handled through Supabase Auth and JWT-based sessions.

Environment security

Secrets should be managed through:

Local development → .env
Production → Vercel Environment Variables

Never commit production credentials to GitHub.

🔌 API Overview

StudyFlow exposes backend endpoints for authentication, academic data, AI workflows, and study tracking.

Representative endpoint groups include:

/api/health

/api/auth/*

/api/tasks

/api/study-sessions

/api/study-plans

/api/quizzes

/api/ai/recommendation

/api/ai/copilot

/api/ai/quiz

/api/ai/study-plan

/api/ai/task-breakdown

The exact request and response contracts are implemented in the backend source.

🧠 AI Architecture

AI requests follow a server-side flow:

User
 │
 ▼
React Frontend
 │
 ▼
Express API
 │
 ▼
Request validation
 │
 ▼
Gemini API
 │
 ▼
Structured response
 │
 ▼
Frontend UI

This approach keeps the Gemini credential away from the browser and gives the backend control over request validation and response handling.

📊 Product Flow

A typical student workflow looks like:

Create Account
      ↓
Set Academic Goals
      ↓
Create Tasks / Deadlines
      ↓
Generate Study Plan
      ↓
Break Large Tasks into Steps
      ↓
Study
      ↓
Generate Practice Quiz
      ↓
Track Study Sessions
      ↓
Review Progress
      ↓
Adjust Study Plan

🎯 Why StudyFlow?

Students often use several disconnected tools:

Notes        → one application
Tasks        → another application
Calendar     → another application
AI assistant → another application
Quizzes      → another application
Progress     → spreadsheets

StudyFlow attempts to bring these workflows into one student-focused system.

The core product idea is:

Turn academic goals into organized actions, use AI when useful, and make progress visible.

🧪 Example Use Case

Imagine a student has an exam in 14 days.

Instead of manually creating a schedule:

Exam
 │
 ├── Mathematics
 ├── Physics
 └── Computer Science

The student can provide the academic requirements to StudyFlow.

The AI planner can then produce:

Day 1
 ├── Mathematics → Algebra revision
 └── Physics → Mechanics concepts

Day 2
 ├── Mathematics → Practice problems
 └── Computer Science → Data structures

Day 3
 ├── Physics → Numerical practice
 └── Computer Science → Revision

...

Day 14
 └── Final revision + practice quiz

The resulting plan can then be connected to the student's task workflow.

📱 Mobile Installation

On supported mobile browsers:

Open StudyFlow AI.

Open the browser menu.

Select Add to Home Screen or Install App when available.

Launch StudyFlow from the device home screen.

Availability of PWA installation features depends on the browser and operating system.

🖼️ Screenshots

Add project screenshots here as the UI evolves.

Recommended screenshots:

docs/
├── dashboard.png
├── tasks.png
├── ai-copilot.png
├── quiz-generator.png
├── study-planner.png
└── progress.png

Example:

![StudyFlow Dashboard](docs/dashboard.png)

🗺️ Roadmap

Potential future improvements include:

More advanced AI personalization

Calendar integrations

Smarter revision recommendations

Spaced-repetition workflows

More detailed analytics

Improved offline synchronization

Push notifications

Recurring tasks

Academic goal tracking

More quiz formats

Exportable progress reports

Improved mobile experience

The roadmap may change based on user feedback and development priorities.

🤝 Contributing

Contributions, ideas, and bug reports are welcome.

Basic workflow

# Fork the repository

# Clone your fork
git clone https://github.com/your-username/StudyFlow.git

# Create a branch
git checkout -b feature/your-feature

# Make your changes

# Commit
git add .
git commit -m "feat: add your feature"

# Push
git push origin feature/your-feature

Then open a pull request.

🐛 Reporting Issues

When reporting an issue, include:

What you were trying to do

What you expected

What actually happened

Browser/device

Console or server error

Steps to reproduce

Screenshots when useful

This makes debugging significantly easier.

📄 License

This project is licensed under the MIT License.

See LICENSE for details.

👨‍💻 Author

Shreyash Bhosale

GitHub: @shreyash-bhosale

Project: StudyFlow AI

Live Demo: studyflowve.vercel.app

<p align="center">
  Built with React, TypeScript, Node.js, Supabase, Google Gemini, and a lot of debugging. 🚀
</p>

<p align="center">
  <strong>Study smarter. Build better habits. Go beyond average.</strong> 🎓
</p>
