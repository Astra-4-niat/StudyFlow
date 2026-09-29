import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export const SECURITY_QUESTIONS = [
  'What was the name of your first school?',
  'What city or town were you born in?',
  'What is your favorite subject or study topic?',
  'What is the name of your favorite teacher or mentor?',
  'What is your mother\'s maiden name?',
  'What was the model of your first computer or phone?',
];

const SignUp: React.FC = () => {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.fullName, form.securityQuestion, form.securityAnswer);
      toast.success('Account created! Welcome to StudyFlow AI 🎉');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '24px', textDecoration: 'none' }}>
            <BrandLogo size="lg" />
          </Link>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start your AI-powered study journey</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input className="form-input input-with-icon-field" type="text" placeholder="Your full name" value={form.fullName} onChange={update('fullName')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input className="form-input input-with-icon-field" type="email" placeholder="your@email.com" value={form.email} onChange={update('email')} required autoComplete="email" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                className="form-input input-with-icon-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={update('password')}
                required
                autoComplete="new-password"
              />
              <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input className="form-input input-with-icon-field" type="password" placeholder="Confirm password" value={form.confirm} onChange={update('confirm')} required autoComplete="new-password" />
            </div>
          </div>

          {/* Security Question for Instant Password Recovery */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 12px)',
            padding: '14px',
            marginBottom: 'var(--space-4)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Security Question (Instant Recovery)
              </span>
              <span className="badge badge-sm badge-info" style={{ fontSize: 10 }}>Recommended</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.4 }}>
              Allows you to reset your password immediately without waiting for an email.
            </p>

            <div className="form-group" style={{ marginBottom: 10 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Question</label>
              <select
                className="form-input"
                style={{ fontSize: 13, padding: '8px 12px' }}
                value={form.securityQuestion}
                onChange={update('securityQuestion')}
              >
                {SECURITY_QUESTIONS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: 12 }}>Your Answer</label>
              <input
                className="form-input"
                type="text"
                placeholder="Secret answer (case-insensitive)"
                value={form.securityAnswer}
                onChange={update('securityAnswer')}
                style={{ fontSize: 13, padding: '8px 12px' }}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><div className="loading-spinner loading-spinner--sm" />Creating account...</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export { SignUp };
