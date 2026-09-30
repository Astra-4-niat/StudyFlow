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

async function captureMobile() {
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
  // iPhone 14/15 viewport (390 x 844 at 2x pixel ratio -> 780 x 1688)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('Logging in on mobile viewport...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  await page.type('input[type="email"]', USER_EMAIL);
  await page.type('input[type="password"]', USER_PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  // Seed realistic academic data into localStorage
  await page.evaluate(({ userId, tasks, sessions }) => {
    localStorage.setItem(`studyflow_tasks_${userId}`, JSON.stringify(tasks));
    localStorage.setItem(`studyflow_sessions_${userId}`, JSON.stringify(sessions));
    localStorage.setItem('studyflow_tasks', JSON.stringify(tasks));
    localStorage.setItem('studyflow_sessions', JSON.stringify(sessions));
  }, { userId: USER_ID, tasks: sampleTasks, sessions: sampleSessions });

  console.log('Sample academic data seeded.');

  async function cleanUI(p) {
    await p.evaluate(() => {
      // Hide PWA banner and toaster
      const banner = document.querySelector('[class*="install-banner"], .install-banner');
      if (banner) banner.style.display = 'none';
      document.querySelectorAll('.toaster, [class*="toast"]').forEach(el => el.style.display = 'none');
      window.scrollTo(0, 0);
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

  // 1. Dashboard Mobile
  await snap('http://localhost:5173/dashboard', 'dashboard-mobile.png');

  // 2. Tasks Mobile
  await snap('http://localhost:5173/tasks', 'tasks-mobile.png', async (p) => {
    await p.evaluate(() => {
      // Switch to List view if available
      const buttons = Array.from(document.querySelectorAll('button'));
      const listBtn = buttons.find(b => b.textContent && b.textContent.includes('List'));
      if (listBtn) listBtn.click();
    });
  });

  // 3. AI Copilot Mobile
  await snap('http://localhost:5173/copilot', 'ai-copilot-mobile.png', async (p) => {
    await p.evaluate(() => {
      const container = document.querySelector('.chat-messages, [class*="chat-messages"]');
      if (container) {
        container.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:14px; width:100%;">
            <div style="align-self:flex-end; max-width:85%; background:var(--accent); color:#fff; padding:10px 14px; border-radius:16px 16px 4px 16px; font-size:13px; font-weight:500;">
              Can you help me prepare a high-yield study strategy for my Deep Learning exam on Wednesday?
            </div>
            <div style="align-self:flex-start; max-width:96%; background:var(--bg-card); border:1px solid var(--border); padding:14px 16px; border-radius:16px 16px 16px 4px; font-size:13px; line-height:1.5; color:var(--text-primary); box-shadow:0 4px 16px rgba(0,0,0,0.25);">
              <p style="font-weight:600; margin-bottom:8px; display:flex; align-items:center; gap:6px; color:var(--accent);">
                <span>✨ StudyFlow AI Copilot</span>
              </p>
              <p style="margin-bottom:8px;">Here is your structured 3-stage high-yield strategy:</p>
              <ul style="padding-left:16px; margin:8px 0; display:flex; flex-direction:column; gap:5px;">
                <li><strong>Day 1:</strong> Residual Connections (ResNet) & proofs.</li>
                <li><strong>Day 2:</strong> Cross-Entropy loss & Adam vs SGD.</li>
                <li><strong>Day 3:</strong> CNN dimension math & parameter counts.</li>
              </ul>
              <div style="background:var(--bg-elevated); padding:8px 10px; border-radius:8px; border:1px solid var(--border-subtle); margin-top:8px; font-size:12px; color:var(--text-secondary);">
                💡 <strong>Mentor Note:</strong> 3 pending tasks scheduled. Start your first Pomodoro session before noon.
              </div>
            </div>
          </div>
        `;
      }
    });
  });

  await browser.close();
  console.log('Mobile screenshots captured successfully!');
}

captureMobile().catch(err => {
  console.error('Mobile capture error:', err);
  process.exit(1);
});
