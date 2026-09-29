import { Router, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const CANDIDATE_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
];

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const getCleanGeminiKey = (): string => {
  let key = process.env.GEMINI_API_KEY || '';
  if (!key && process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('GEMINI_API_KEY=')) {
    const match = process.env.SUPABASE_SERVICE_ROLE_KEY.match(/GEMINI_API_KEY=\s*([^\s\r\n]+)/);
    if (match) key = match[1];
  }
  return key.trim().split(/[\s\r\n]+/)[0].replace(/^GEMINI_API_KEY=/i, '').replace(/['";]/g, '');
};

const getGenAI = (): GoogleGenerativeAI => {
  const apiKey = getCleanGeminiKey();
  return new GoogleGenerativeAI(apiKey || 'placeholder-key');
};

// Helper: call Gemini with automatic model failover on temporary 503/429/404
async function callGemini(prompt: string): Promise<string> {
  const apiKey = getCleanGeminiKey();
  if (!apiKey || apiKey === 'placeholder-key') {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  const genAI = getGenAI();
  let lastErr: any;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      const isRetryable = err.status === 503 || err.status === 429 || err.status === 404 || (err.message && (err.message.includes('503') || err.message.includes('high demand') || err.message.includes('429') || err.message.includes('not found') || err.message.includes('no longer available')));
      if (isRetryable) {
        await sleep(600);
        continue; // Try next candidate model with brief backoff
      }
      throw err;
    }
  }
  throw lastErr;
}

// Helper: run Copilot chat with multi-model fallback
async function runCopilotChat(message: string, history: { role: 'user' | 'model'; content: string }[], systemPrompt: string): Promise<string> {
  const apiKey = getCleanGeminiKey();
  if (!apiKey || apiKey === 'placeholder-key') {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }
  const genAI = getGenAI();
  let lastErr: any;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const m = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemPrompt,
      });
      const chat = m.startChat({
        history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] })),
      });
      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      const isRetryable = err.status === 503 || err.status === 429 || err.status === 404 || (err.message && (err.message.includes('503') || err.message.includes('high demand') || err.message.includes('429') || err.message.includes('not found') || err.message.includes('no longer available')));
      if (isRetryable) {
        continue; // Try next candidate model
      }
      throw err;
    }
  }
  throw lastErr;
}

// Helper: parse JSON from AI response (strips markdown code fences or extracts JSON object)
function parseAIJson(text: string): unknown {
  const clean = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
    const firstBracket = clean.indexOf('[');
    const lastBracket = clean.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      return JSON.parse(clean.substring(firstBracket, lastBracket + 1));
    }
    throw new Error('Failed to parse AI output as JSON');
  }
}

// POST /api/ai/study-plan
router.post('/study-plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      goal: z.string().min(1),
      subjects: z.string().min(1),
      examDate: z.string(),
      hoursPerDay: z.number().min(0.5).max(12),
      sessionDuration: z.number().min(15).max(180).optional().default(45),
      difficulty: z.preprocess(
        v => (v === 'moderate' ? 'intermediate' : v),
        z.enum(['beginner', 'intermediate', 'advanced'])
      ).optional().default('intermediate'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.errors }); return; }
    const { goal, subjects, examDate, hoursPerDay, sessionDuration, difficulty } = parsed.data;

    const prompt = `You are an academic study planner AI. Create a detailed study plan as JSON only. No other text.

Goal: ${goal}
Subjects/Topics: ${subjects}
Exam/Target Date: ${examDate}
Available study time: ${hoursPerDay} hours per day
Preferred session duration: ${sessionDuration} minutes
Difficulty level: ${difficulty}
Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY valid JSON in exactly this structure:
{
  "title": "string",
  "summary": "string",
  "totalDays": number,
  "totalMinutes": number,
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayNumber": number,
      "focus": "string",
      "totalMinutes": number,
      "activities": [
        {
          "title": "string",
          "subject": "string",
          "type": "study|review|practice|break",
          "duration": number,
          "description": "string"
        }
      ]
    }
  ]
}`;

    const text = await callGemini(prompt);
    const planData = parseAIJson(text) as { title: string; summary: string; totalDays: number; totalMinutes: number; days: unknown[] };
    
    // Save to DB
    const db = req.supabase || supabaseAdmin;
    const { data: saved, error } = await db
      .from('study_plans')
      .insert({
        user_id: req.userId,
        title: planData.title || goal,
        description: planData.summary || '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: examDate,
        total_minutes: planData.totalMinutes || 0,
        plan_data: planData,
      })
      .select().single();
    if (error) console.error('Failed to save study plan to DB:', error);

    res.json({ plan: planData, saved });
  } catch (err) {
    console.error('AI study plan error:', err);
    res.status(500).json({ error: 'Failed to generate study plan. Please try again.' });
  }
});

// POST /api/ai/task-breakdown
router.post('/task-breakdown', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({ taskId: z.string().uuid().optional(), title: z.string().min(1), description: z.string().optional(), subject: z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
    const { title, description, subject } = parsed.data;

    const prompt = `You are an academic task breakdown assistant. Break the following task into 5-8 clear, actionable steps. Return ONLY valid JSON.

Task: ${title}
Description: ${description || 'N/A'}
Subject: ${subject || 'General'}

Return ONLY valid JSON:
{
  "taskTitle": "string",
  "steps": [
    {
      "stepNumber": number,
      "title": "string",
      "description": "string",
      "estimatedMinutes": number,
      "tips": "string"
    }
  ],
  "totalEstimatedMinutes": number,
  "advice": "string"
}`;

    try {
      const text = await callGemini(prompt);
      const breakdown = parseAIJson(text);
      res.json(breakdown);
    } catch (aiErr) {
      console.warn('AI breakdown temporary failure, returning structured fallback:', aiErr);
      res.json({
        taskTitle: title,
        steps: [
          { stepNumber: 1, title: 'Understand Goals & Gather Materials', description: `Review expectations and organize all necessary references for ${title}.`, estimatedMinutes: 15, tips: 'Collect your lecture notes and syllabus before starting.' },
          { stepNumber: 2, title: 'Outline Key Sub-topics', description: `Deconstruct ${title} into 3-4 structured milestones or focus areas.`, estimatedMinutes: 20, tips: 'Focus on high-yield concepts first.' },
          { stepNumber: 3, title: 'Deep Work & Focused Execution', description: `Complete the primary analysis, writing, or practice problems for ${title}.`, estimatedMinutes: 45, tips: 'Eliminate distractions; use 25-minute Pomodoro sprints.' },
          { stepNumber: 4, title: 'Review & Self-Assessment', description: 'Review your work against guidelines and test your conceptual understanding.', estimatedMinutes: 15, tips: 'Use active recall to verify retention.' },
          { stepNumber: 5, title: 'Final Polish & Session Log', description: 'Make final refinements and log your completed study session in StudyFlow.', estimatedMinutes: 10, tips: 'Take pride in completing this milestone!' },
        ],
        totalEstimatedMinutes: 105,
        advice: 'Tackle Step 1 immediately to build momentum. Small steps lead to mastery.'
      });
    }
  } catch (err) {
    console.error('Task breakdown error:', err);
    res.status(500).json({ error: 'Failed to break down task. Please try again.' });
  }
});

// POST /api/ai/copilot
router.post('/copilot', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      message: z.string().min(1).max(2000),
      history: z.array(z.object({ role: z.enum(['user', 'model']), content: z.string() })).optional().default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input' }); return; }
    const { message } = parsed.data;
    const history: { role: 'user' | 'model'; content: string }[] = (parsed.data.history || []).map(item => ({
      role: (item.role === 'model' ? 'model' : 'user') as 'user' | 'model',
      content: item.content || '',
    }));

    // Fetch comprehensive user context: tasks, AI study plans, and recent sessions
    const db = req.supabase || supabaseAdmin;
    const [tasksResult, studyPlansResult, studySessionsResult, profileResult] = await Promise.all([
      db.from('tasks')
        .select('title,description,subject,deadline,priority,status,estimated_minutes')
        .eq('user_id', req.userId!)
        .order('created_at', { ascending: false })
        .limit(25),
      db.from('study_plans')
        .select('title,description,start_date,end_date,total_minutes,plan_data,created_at')
        .eq('user_id', req.userId!)
        .order('created_at', { ascending: false })
        .limit(5),
      db.from('study_sessions')
        .select('subject,duration_minutes,completed_at')
        .eq('user_id', req.userId!)
        .order('completed_at', { ascending: false })
        .limit(8),
      db.from('profiles').select('full_name').eq('user_id', req.userId!).maybeSingle(),
    ]);

    const studentName = profileResult.data?.full_name || 'Student';

    // Format Tasks Context
    const tasks = tasksResult.data || [];
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    let taskContext = 'No tasks recorded yet.';
    if (tasks.length > 0) {
      const pendingStr = pendingTasks.length > 0
        ? pendingTasks.map(t => `- [${t.priority.toUpperCase()}] "${t.title}" (Subject: ${t.subject}, Due: ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline'}, Est: ${t.estimated_minutes ? `${t.estimated_minutes}m` : 'N/A'})${t.description ? `\n    Description: ${t.description}` : ''}`).join('\n')
        : 'All tasks completed!';

      const completedStr = completedTasks.length > 0
        ? completedTasks.slice(0, 5).map(t => `- ✓ "${t.title}" (${t.subject})`).join('\n')
        : 'None yet';

      taskContext = `PENDING TASKS (${pendingTasks.length}):\n${pendingStr}\n\nRECENTLY COMPLETED TASKS (${completedTasks.length}):\n${completedStr}`;
    }

    // Format AI Study Plans Context
    const studyPlans = studyPlansResult.data || [];
    let plannerContext = 'No study plans generated yet.';
    if (studyPlans.length > 0) {
      plannerContext = studyPlans.map((sp, idx) => {
        const pd = sp.plan_data as any;
        const daysSummary = Array.isArray(pd?.days)
          ? pd.days.slice(0, 7).map((d: any) => {
              const actList = Array.isArray(d.activities)
                ? d.activities.map((a: any) => `    * [${a.duration || 30}m] ${a.title} (${a.type || 'study'}: ${a.description || 'Practice & revision'})`).join('\n')
                : '    * No specific activities recorded';
              return `  - Day ${d.dayNumber || idx + 1} (${d.date ? new Date(d.date).toLocaleDateString() : 'TBD'}): Focus on "${d.focus || 'Core concepts'}" (${d.totalMinutes || 0}m total)\n${actList}`;
            }).join('\n')
          : '  - Schedule details pending';

        return `Plan #${idx + 1}: "${sp.title}"
• Summary: ${pd?.summary || sp.description || 'Personalized schedule'}
• Target Timeline: ${sp.start_date || 'N/A'} to ${sp.end_date || 'N/A'} (${pd?.totalDays || 'N/A'} days, ~${Math.round((sp.total_minutes || 0) / 60)} hours total)
• Scheduled Breakdown:
${daysSummary}`;
      }).join('\n\n');
    }

    // Format Recent Study Sessions
    const sessions = studySessionsResult.data || [];
    const sessionsContext = sessions.length > 0
      ? sessions.map(s => `- ${s.subject}: ${s.duration_minutes} minutes on ${new Date(s.completed_at).toLocaleDateString()}`).join('\n')
      : 'No recent study sessions logged.';

    const systemPrompt = `You are StudyFlow AI Copilot, a high-level academic mentor and intelligent study assistant for ${studentName}.
You have direct, real-time access to the student's complete StudyFlow workspace, including their AI Study Plans, active tasks, and study sessions.

==============================
STUDENT'S AI STUDY PLANS & SCHEDULE:
==============================
${plannerContext}

==============================
STUDENT'S TASKS & ASSIGNMENTS:
==============================
${taskContext}

==============================
RECENT STUDY ACTIVITY:
==============================
${sessionsContext}

==============================
CORE INSTRUCTIONS:
- You know all details of their study plan (the daily focuses, activities, durations, subjects, and exam dates) and their tasks (priorities, deadlines, status).
- When the student asks about their study plan ("What's in my study plan?", "What do I need to study today?", "How is my physics preparation going?"), reference the EXACT plans and tasks detailed above.
- If they ask for help prioritizing, recommend which study plan activities or urgent tasks to tackle first.
- Provide encouraging, structured, and actionable guidance (use bullet points or numbered steps).
- When relevant, offer study techniques (Active Recall, Pomodoro method, Spaced Repetition) tailored to their scheduled topics.`;

    const responseText = await runCopilotChat(message, history, systemPrompt);
    res.json({ response: responseText });
  } catch (err) {
    console.error('Copilot error:', err);
    const isOverloaded = (err as any)?.status === 503 || (err as any)?.message?.includes('503') || (err as any)?.message?.includes('high demand');
    if (isOverloaded) {
      res.json({ response: "I'm currently assisting many students and experiencing a brief high-demand spike. Please ask your question again in a moment!" });
      return;
    }
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

// POST /api/ai/quiz
router.post('/quiz', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      topic: z.string().min(1).max(200),
      numQuestions: z.number().int().min(3).max(20).optional().default(5),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid input', details: parsed.error.errors }); return; }
    const { topic, numQuestions, difficulty } = parsed.data;

    const prompt = `Generate a ${difficulty} difficulty multiple-choice quiz about "${topic}" with ${numQuestions} questions. Return ONLY valid JSON.

{
  "topic": "string",
  "difficulty": "string",
  "questions": [
    {
      "id": number,
      "question": "string",
      "options": ["A. option", "B. option", "C. option", "D. option"],
      "correctAnswer": "A",
      "explanation": "string"
    }
  ]
}`;

    const text = await callGemini(prompt);
    const parsedData = parseAIJson(text) as any;

    let rawQuestions: any[] = [];
    if (Array.isArray(parsedData)) {
      rawQuestions = parsedData;
    } else if (Array.isArray(parsedData?.questions)) {
      rawQuestions = parsedData.questions;
    } else if (Array.isArray(parsedData?.quiz)) {
      rawQuestions = parsedData.quiz;
    }

    if (rawQuestions.length === 0) {
      res.status(500).json({ error: 'Unable to parse quiz questions from AI response.' });
      return;
    }

    const letters = ['A', 'B', 'C', 'D'];
    const normalizedQuestions = rawQuestions.map((q: any, index: number) => {
      let options: string[] = Array.isArray(q.options) ? q.options.map(String) : [];
      options = options.slice(0, 4).map((opt, i) => {
        const prefix = `${letters[i]}. `;
        return /^[A-D]\.\s/i.test(opt) ? `${letters[i]}. ${opt.replace(/^[A-D]\.\s*/i, '')}` : `${prefix}${opt}`;
      });
      while (options.length < 4) {
        options.push(`${letters[options.length]}. Option ${letters[options.length]}`);
      }

      let ans = String(q.correctAnswer || 'A').trim();
      const firstChar = ans.charAt(0).toUpperCase();
      const correctAnswer = letters.includes(firstChar) ? firstChar : 'A';

      return {
        id: index + 1,
        question: q.question || `Question ${index + 1}`,
        options,
        correctAnswer,
        explanation: q.explanation || 'Review the topic concepts to reinforce this answer.',
      };
    });

    res.json({
      topic,
      difficulty,
      questions: normalizedQuestions,
    });
  } catch (err) {
    console.error('Quiz generation error:', err);
    res.status(500).json({ error: 'Failed to generate quiz. Please try again.' });
  }
});

// POST /api/ai/recommendation
router.post('/recommendation', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const [tasksResult, sessionsResult] = await Promise.all([
      db.from('tasks').select('*').eq('user_id', req.userId!).neq('status', 'completed').order('deadline').limit(10),
      db.from('study_sessions').select('subject,duration_minutes,completed_at').eq('user_id', req.userId!).order('completed_at', { ascending: false }).limit(7),
    ]);

    const tasks = tasksResult.data || [];
    const sessions = sessionsResult.data || [];

    if (tasks.length === 0) {
      res.json({ recommendation: "Start by adding your first task to get personalized AI recommendations! 🎯" }); return;
    }

    const taskSummary = tasks.map(t =>
      `- ${t.title} (${t.subject}, ${t.priority} priority, status: ${t.status}, due: ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'no deadline'})`
    ).join('\n');
    const sessionSummary = sessions.length > 0
      ? sessions.map(s => `- ${s.subject}: ${s.duration_minutes}min on ${new Date(s.completed_at).toLocaleDateString()}`).join('\n')
      : 'No recent study sessions';

    const prompt = `You are a smart academic advisor AI. Based on this student's data, give one specific, personalized recommendation in 2-3 sentences.

Active tasks:
${taskSummary}

Recent study sessions:
${sessionSummary}
Today: ${new Date().toLocaleDateString()}

Give a helpful, actionable recommendation. Be specific, not generic.`;

    const text = await callGemini(prompt);
    res.json({ recommendation: text.trim() });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to generate recommendation.' });
  }
});

// POST /api/ai/prioritize
router.post('/prioritize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { data: tasks } = await db
      .from('tasks')
      .select('id,title,subject,priority,deadline,estimated_minutes,status')
      .eq('user_id', req.userId!)
      .neq('status', 'completed')
      .order('deadline');

    if (!tasks || tasks.length === 0) {
      res.json({ prioritized: [], message: 'No active tasks to prioritize.' }); return;
    }

    const taskSummary = tasks.map((t, i) =>
      `${i + 1}. ${t.title} | subject: ${t.subject} | priority: ${t.priority} | deadline: ${t.deadline || 'none'} | estimated: ${t.estimated_minutes || 0}min | status: ${t.status}`
    ).join('\n');

    const prompt = `You are an academic productivity expert. Prioritize these student tasks and explain why. Return ONLY valid JSON.

Tasks:
${taskSummary}

Today: ${new Date().toISOString()}

{
  "prioritized": [
    {
      "taskTitle": "string",
      "rank": number,
      "reason": "string",
      "urgency": "critical|high|medium|low"
    }
  ],
  "summary": "string"
}`;

    const text = await callGemini(prompt);
    const result = parseAIJson(text);
    res.json(result);
  } catch (err) {
    console.error('Prioritize error:', err);
    res.status(500).json({ error: 'Failed to prioritize tasks.' });
  }
});

export { router as aiRoutes };
