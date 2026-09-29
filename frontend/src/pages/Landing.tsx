import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Calendar, Bot, Brain, TrendingUp, ArrowRight, Zap, Shield, BookOpen } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import './Landing.css';

const features = [
  { icon: CheckCircle, title: 'Smart Task Management', desc: 'Create, organize and track assignments, exams, and projects with priorities and deadlines.' },
  { icon: Calendar, title: 'AI Study Planner', desc: 'Generate personalized day-by-day study plans powered by Gemini AI based on your goals.' },
  { icon: Bot, title: 'AI Copilot', desc: 'Chat with your intelligent academic assistant for guidance, planning, and explanations.' },
  { icon: Brain, title: 'Quiz Generator', desc: 'Create custom quizzes on any topic at any difficulty. Test yourself and track performance.' },
  { icon: TrendingUp, title: 'Progress Tracking', desc: 'Visualize your study time, completion rates, and subject distribution with real data.' },
  { icon: Shield, title: 'Secure & Private', desc: 'Your academic data is private to you. Backed by Supabase with Row Level Security.' },
];

const steps = [
  { n: '01', title: 'Add Your Tasks', desc: 'Create tasks for assignments, exams, and projects with deadlines and priorities.' },
  { n: '02', title: 'Generate a Study Plan', desc: 'Tell Gemini AI your goal and exam date. Get a complete day-by-day plan in seconds.' },
  { n: '03', title: 'Study Smarter', desc: 'Follow your plan, track progress, quiz yourself, and ask your AI Copilot anything.' },
];

const Landing: React.FC = () => {
  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <BrandLogo size="md" />
          </Link>
          <div className="landing-nav-actions">
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <Zap size={12} />
            Powered by Google Gemini AI
          </div>
          <h1 className="hero-title">
            Plan smarter.<br />
            <span className="hero-title-accent">Learn better.</span><br />
            Achieve more.
          </h1>
          <p className="hero-subtitle">
            An AI-powered academic command center that helps you organize tasks,<br className="hero-br" />
            build personalized study plans, and stay ahead of every deadline.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg">
              Sign In
            </Link>
          </div>
          <p className="hero-note">Free to use · No credit card required</p>
        </div>

        {/* Floating dashboard preview */}
        <div className="hero-visual">
          <div className="dashboard-preview">
            <div className="preview-header">
              <div className="preview-dot red" /><div className="preview-dot yellow" /><div className="preview-dot green" />
              <span className="preview-url">studyflow.ai/dashboard</span>
            </div>
            <div className="preview-body">
              <div className="preview-greeting">Good morning, Alex 👋</div>
              <div className="preview-stats-row">
                <div className="preview-stat"><div className="preview-stat-val">12</div><div className="preview-stat-lbl">Tasks</div></div>
                <div className="preview-stat accent"><div className="preview-stat-val">8</div><div className="preview-stat-lbl">Done</div></div>
                <div className="preview-stat"><div className="preview-stat-val">3</div><div className="preview-stat-lbl">Due Soon</div></div>
              </div>
              <div className="preview-tasks">
                <div className="preview-task high"><span className="preview-task-dot" />Physics Exam Prep<span className="preview-task-badge">High</span></div>
                <div className="preview-task medium"><span className="preview-task-dot" />CS Project<span className="preview-task-badge">Medium</span></div>
                <div className="preview-task done"><span className="preview-task-check">✓</span>Math Assignment</div>
              </div>
              <div className="preview-ai-card">
                <span className="preview-ai-icon">✨</span>
                <span className="preview-ai-text">AI: Complete Physics exam prep before the CS project — deadline is in 2 days.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="section-label">How it works</div>
          <h2 className="landing-section-title">Three steps to academic excellence</h2>
          <div className="steps-grid">
            {steps.map((step) => (
              <div key={step.n} className="step-card">
                <div className="step-number">{step.n}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section landing-section--alt">
        <div className="landing-container">
          <div className="section-label">Features</div>
          <h2 className="landing-section-title">Everything you need to succeed</h2>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div className="feature-icon"><Icon size={22} /></div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Section */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="ai-highlight">
            <div className="ai-highlight-content">
              <div className="section-label">AI Capabilities</div>
              <h2 className="ai-highlight-title">Your personal AI study partner</h2>
              <p className="ai-highlight-text">
                StudyFlow AI integrates Google Gemini to provide intelligent, context-aware academic assistance.
                Every AI feature uses your real task data to give personalized, relevant recommendations.
              </p>
              <ul className="ai-features-list">
                {['Generate complete study plans from your goals', 'Break complex tasks into actionable steps', 'Create quizzes on any academic topic', 'Prioritize your tasks by urgency and effort', 'Answer academic questions and explain concepts'].map(f => (
                  <li key={f}><CheckCircle size={16} />{f}</li>
                ))}
              </ul>
              <Link to="/signup" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Start Using AI <ArrowRight size={16} />
              </Link>
            </div>
            <div className="ai-highlight-visual">
              <div className="copilot-preview">
                <div className="copilot-header"><BookOpen size={16} />AI Copilot</div>
                <div className="copilot-message user">How should I prepare for my Physics exam in 5 days?</div>
                <div className="copilot-message ai">
                  <strong>Here's your 5-day Physics exam plan:</strong><br /><br />
                  📖 Days 1-2: Review core concepts (Electrostatics, Magnetism)<br />
                  ✏️ Day 3: Solve 20 practice problems<br />
                  🔄 Day 4: Review weak areas + formula sheet<br />
                  ✅ Day 5: Mock test + final revision
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section landing-cta">
        <div className="landing-container">
          <h2 className="cta-title">Ready to transform your study life?</h2>
          <p className="cta-subtitle">Join thousands of students using AI to stay ahead of their academics.</p>
          <Link to="/signup" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <BrandLogo size="sm" />
          </Link>
          <p className="footer-copy">© 2026 StudyFlow AI. Intelligent Academic Command Center.</p>
        </div>
      </footer>
    </div>
  );
};

export { Landing };
