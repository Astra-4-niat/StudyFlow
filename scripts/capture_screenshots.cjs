const puppeteer = require('../node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.join(__dirname, '../docs/screenshots');

const USER_ID = '89aa0ca5-3a51-499e-8d88-14f1b7056d81';
const USER_EMAIL = 'alex.vance@studyflow.demo';
const USER_PASSWORD = 'StudyFlowPassword2026!';

const sampleTasks = [
  {
    id: 'task-1',
    user_id: USER_ID,
    title: 'Complete Deep Learning Assignment 3 (CNNs & ResNet)',
    description: 'Implement residual blocks in PyTorch, train on CIFAR-10, and plot validation loss curve.',
    subject: 'Computer Science',
    priority: 'high',
    status: 'in_progress',
    due_date: new Date(Date.now() + 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'task-2',
    user_id: USER_ID,
    title: 'Calculus III: Vector Fields & Green’s Theorem Practice',
    description: 'Solve problem set 8 questions 1 through 12. Review surface flux integrals.',
    subject: 'Mathematics',
    priority: 'medium',
    status: 'pending',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-3',
    user_id: USER_ID,
    title: 'Revise Organic Chemistry Mechanisms: Aldol & Claisen',
    description: 'Draw step-by-step enolate attack and dehydration mechanisms with arrow-pushing.',
    subject: 'Chemistry',
    priority: 'urgent',
    status: 'pending',
    due_date: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'task-4',
    user_id: USER_ID,
    title: 'Review Microeconomics: Game Theory & Nash Equilibrium',
    description: 'Analyze payoff matrix examples and prepare discussion questions for tutorial.',
    subject: 'Economics',
    priority: 'low',
    status: 'completed',
    due_date: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'task-5',
    user_id: USER_ID,
    title: 'Read Academic Paper: Attention Is All You Need',
    description: 'Annotate self-attention equations, multi-head projections, and positional encoding.',
    subject: 'Computer Science',
    priority: 'medium',
    status: 'completed',
    due_date: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const sampleSessions = [
  { id: 'sess-1', user_id: USER_ID, subject: 'Computer Science', duration_minutes: 60, created_at: new Date().toISOString() },
  { id: 'sess-2', user_id: USER_ID, subject: 'Mathematics', duration_minutes: 45, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 'sess-3', user_id: USER_ID, subject: 'Chemistry', duration_minutes: 50, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'sess-4', user_id: USER_ID, subject: 'Computer Science', duration_minutes: 75, created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'sess-5', user_id: USER_ID, subject: 'Economics', duration_minutes: 40, created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
];

const samplePlan = {
  id: 'plan-1',
  user_id: USER_ID,
  goal: 'Ace Computer Systems & Architecture Final Exam',
  exam_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
  hours_per_day: 3,
  plan_data: {
    overview: 'High-yield 14-day mastery track for hardware architecture, pipelining, and memory hierarchy.',
    schedule: [
      {
        day: 1,
        date: 'Day 1 — Foundation',
        topics: ['Instruction Set Architecture (ISA)', 'MIPS vs RISC-V register files', 'Instruction formats (R, I, J types)'],
        hours: 3,
        practiceTasks: ['Trace 5 arithmetic instruction sequences', 'Decode binary instruction machine code']
      },
      {
        day: 2,
        date: 'Day 2 — Processor Datapath',
        topics: ['Single-Cycle vs Multi-Cycle Datapath', 'Control unit signals', 'ALU control logic'],
        hours: 3,
        practiceTasks: ['Draw datapath execution for LW & SW', 'Calculate critical path clock cycle time']
      },
      {
        day: 3,
        date: 'Day 3 — Pipelining & Hazards',
        topics: ['5-Stage Pipeline (IF, ID, EX, MEM, WB)', 'Data Hazards & Forwarding units', 'Branch hazards & delay slots'],
        hours: 3,
        practiceTasks: ['Compute speedup ratio from pipelining', 'Solve pipeline timing hazard problem set']
      },
      {
        day: 4,
        date: 'Day 4 — Memory Hierarchy',
        topics: ['L1/L2 Cache Organization', 'Direct Mapped vs Set-Associative', 'Cache Misses (Compulsory, Capacity, Conflict)'],
        hours: 3,
        practiceTasks: ['Calculate Average Memory Access Time (AMAT)', 'Simulate 8-block cache replacement']
      }
    ]
  },
  created_at: new Date().toISOString()
};

async function capture() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--force-device-scale-factor=2',
      '--high-dpi-support=1',
      '--disable-gpu',
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  // 1. Visit Login page and authenticate
  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  await page.type('input[type="email"]', USER_EMAIL);
  await page.type('input[type="password"]', USER_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  // 2. Seed realistic data into storage for this user
  await page.evaluate(({ userId, tasks, sessions, plan }) => {
    localStorage.setItem(`studyflow_tasks_${userId}`, JSON.stringify(tasks));
    localStorage.setItem(`studyflow_sessions_${userId}`, JSON.stringify(sessions));
    localStorage.setItem(`studyflow_plans_${userId}`, JSON.stringify([plan]));
    localStorage.setItem('studyflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('studyflow_sessions', JSON.stringify(sessions));
    localStorage.setItem('studyflow_plans', JSON.stringify([plan]));
  }, { userId: USER_ID, tasks: sampleTasks, sessions: sampleSessions, plan: samplePlan });

  console.log('Sample academic data seeded.');

  // Clean UI helper
  async function cleanUI(p) {
    await p.evaluate(() => {
      // Hide PWA install prompt banner for clean screenshots
      const banner = document.querySelector('[class*="install-banner"], .install-banner');
      if (banner) banner.style.display = 'none';
      // Dismiss any transient toast
      document.querySelectorAll('.toaster, [class*="toast"]').forEach(el => el.style.display = 'none');
    });
  }

  async function snap(url, fileName, setupFn) {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    await cleanUI(page);
    if (setupFn) {
      await setupFn(page);
      await new Promise(r => setTimeout(r, 600));
      await cleanUI(page);
    }
    const outPath = path.join(OUT_DIR, fileName);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved: ${fileName}`);
  }

  // 1. Dashboard Web
  await snap('http://localhost:5173/dashboard', 'dashboard-web.png');

  // 2. Tasks Web (Switch to List view to showcase all task cards)
  await snap('http://localhost:5173/tasks', 'tasks-web.png', async (p) => {
    await p.evaluate(() => {
      // Click the List view toggle button
      const buttons = Array.from(document.querySelectorAll('button'));
      const listBtn = buttons.find(b => b.textContent && b.textContent.includes('List'));
      if (listBtn) listBtn.click();
    });
  });

  // 3. AI Copilot Web
  await snap('http://localhost:5173/copilot', 'ai-copilot-web.png', async (p) => {
    await p.evaluate(() => {
      const container = document.querySelector('.chat-messages, [class*="chat-messages"]');
      if (container) {
        container.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:18px; width:100%;">
            <div style="align-self:flex-end; max-width:70%; background:var(--accent); color:#fff; padding:12px 18px; border-radius:18px 18px 4px 18px; font-size:14px; font-weight:500;">
              Can you help me prepare a high-yield study strategy for my Deep Learning exam on Wednesday?
            </div>
            <div style="align-self:flex-start; max-width:85%; background:var(--bg-card); border:1px solid var(--border); padding:18px 22px; border-radius:18px 18px 18px 4px; font-size:14px; line-height:1.6; color:var(--text-primary); box-shadow:0 4px 20px rgba(0,0,0,0.2);">
              <p style="font-weight:600; margin-bottom:10px; display:flex; align-items:center; gap:6px; color:var(--accent);">
                <span>✨ StudyFlow AI Copilot</span>
              </p>
              <p>Here is your structured 3-stage high-yield strategy based on your 2 upcoming deadlines:</p>
              <ul style="padding-left:20px; margin:10px 0; display:flex; flex-direction:column; gap:6px;">
                <li><strong>Core Architecture (Day 1):</strong> Review Residual Connections (ResNet) and vanishing gradient mathematical proofs.</li>
                <li><strong>Loss & Optimization (Day 2):</strong> Master Cross-Entropy loss equations, Adam vs SGD with momentum, and learning rate scheduling.</li>
                <li><strong>Active Recall (Day 3):</strong> Run 2 timed practice sets on CNN feature map dimension formulas and parameter counting.</li>
              </ul>
              <div style="background:var(--bg-elevated); padding:10px 14px; border-radius:10px; border:1px solid var(--border-subtle); margin-top:10px; font-size:13px; color:var(--text-secondary);">
                💡 <strong>Academic Mentor Note:</strong> You have 3 pending tasks scheduled this week. Allocate your first 45-minute Pomodoro session before noon.
              </div>
            </div>
          </div>
        `;
      }
    });
  });

  // 4. Quiz Generator Web (Fill in details to display interactive state)
  await snap('http://localhost:5173/quiz', 'quiz-generator-web.png', async (p) => {
    await p.evaluate(() => {
      const topicInput = document.querySelector('input[placeholder*="topic"], input[type="text"]');
      if (topicInput) {
        topicInput.value = 'Distributed Systems & Consensus (Raft / Paxos)';
        topicInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });

  // 5. Study Planner Web (Display saved study plan)
  await snap('http://localhost:5173/planner', 'study-planner-web.png', async (p) => {
    await p.evaluate(() => {
      const goalInput = document.querySelector('input[placeholder*="goal"], input[type="text"]');
      if (goalInput) {
        goalInput.value = 'Ace Computer Systems & Architecture Final Exam';
        goalInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });

  // 6. Dashboard Mobile (iPhone 14/15)
  console.log('Switching to mobile viewport (iPhone 14/15)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await snap('http://localhost:5173/dashboard', 'dashboard-mobile.png', async (p) => {
    await p.evaluate(() => {
      window.scrollTo(0, 0);
    });
  });

  await browser.close();
  console.log('ALL 6 SCREENSHOTS PERFECTED AND SAVED!');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
