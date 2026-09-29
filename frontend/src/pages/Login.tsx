import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, CheckCircle, KeyRound, ExternalLink, Copy, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/Modal';
import api from '../lib/api';
import toast from 'react-hot-toast';
import './Auth.css';

const Login: React.FC = () => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotRecoveryUrl, setForgotRecoveryUrl] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState('');
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) return;
    if (forgotCooldown > 0) {
      toast.error(`Please wait ${forgotCooldown}s before requesting again.`);
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotRecoveryUrl(null);

    try {
      // Primary: Call the backend endpoint which automatically falls back to generating a secure direct recovery link if rate-limited
      const res = await api.post('/api/auth/forgot-password', { email: cleanEmail });
      if (res.data?.recoveryUrl) {
        setForgotRecoveryUrl(res.data.recoveryUrl);
        toast.success('Recovery link generated!');
      } else {
        setForgotSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (backendErr: any) {
      const serverMsg = backendErr?.data?.error || backendErr?.message || '';
      const isRateLimit = backendErr?.status === 429 || serverMsg.toLowerCase().includes('rate limit');

      if (isRateLimit) {
        setForgotCooldown(60);
        setForgotError('Email provider limit reached (3 emails/hour). If you already received a recovery link earlier, please check your inbox or spam folder. You can request again in 60s.');
        toast.error('Email rate limit reached. Please wait before retrying.');
        return;
      }

      // If backend was unreachable, try direct Supabase client call
      try {
        await resetPassword(cleanEmail);
        setForgotSent(true);
        toast.success('Password reset email sent!');
      } catch (clientErr: any) {
        const clientMsg = clientErr instanceof Error ? clientErr.message : 'Failed to send reset link';
        if (clientMsg.toLowerCase().includes('rate limit')) {
          setForgotCooldown(60);
          setForgotError('Email provider limit reached (3 emails/hour). Please check your inbox or spam folder for previous emails, or wait a few minutes before trying again.');
          toast.error('Email rate limit reached. Please check your inbox.');
        } else {
          setForgotError(clientMsg);
          toast.error(clientMsg);
        }
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}>
            <div className="brand-icon"><GraduationCap size={20} /></div>
            <div className="brand-text">
              <span className="brand-name">StudyFlow</span>
              <span className="brand-ai">AI</span>
            </div>
          </Link>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your academic workspace</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                className="form-input input-with-icon-field"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSent(false);
                  setForgotError('');
                  setShowForgotModal(true);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseOver={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseOut={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                Forgot password?
              </button>
            </div>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                className="form-input input-with-icon-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><div className="loading-spinner loading-spinner--sm" />Signing in...</> : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create account</Link>
        </p>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Password"
        size="sm"
      >
        {forgotRecoveryUrl ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--accent, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}>
              <KeyRound size={26} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Recovery Link Ready
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-5)' }}>
              Standard email sending is currently rate-limited by the provider, but we've generated a secure direct password reset link for <strong>{forgotEmail}</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <a
                href={forgotRecoveryUrl}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={16} />
                Reset Password Now
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: 13 }}
                onClick={() => {
                  navigator.clipboard.writeText(forgotRecoveryUrl);
                  setCopiedLink(true);
                  toast.success('Reset link copied to clipboard!');
                  setTimeout(() => setCopiedLink(false), 3000);
                }}
              >
                <Copy size={14} style={{ marginRight: 6 }} />
                {copiedLink ? 'Copied to Clipboard!' : 'Copy Reset Link'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: 12, color: 'var(--text-muted)' }}
                onClick={() => setShowForgotModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : forgotSent ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-3) 0' }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.1)',
              color: 'var(--success, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}>
              <CheckCircle size={28} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Check your inbox
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              We've sent a password reset link to <strong>{forgotEmail}</strong>. Follow the instructions in the email to choose a new password.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setShowForgotModal(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
              Enter the email address registered with your StudyFlow AI account and we will send you a password recovery link.
            </p>

            {forgotCooldown > 0 ? (
              <div style={{
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px solid rgba(234, 179, 8, 0.25)',
                borderRadius: 'var(--radius-md, 12px)',
                padding: '12px 14px',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
              }}>
                <Clock size={18} style={{ color: '#eab308', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 2 }}>
                    Rate Limit Cooldown ({forgotCooldown}s)
                  </strong>
                  {forgotError || 'Please wait before sending another reset request.'}
                </div>
              </div>
            ) : forgotError ? (
              <div className="auth-error" style={{ marginBottom: 'var(--space-4)' }}>
                {forgotError}
              </div>
            ) : null}

            <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} className="input-icon" />
                <input
                  className="form-input input-with-icon-field"
                  type="email"
                  placeholder="your@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowForgotModal(false)}
                disabled={forgotLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={forgotLoading || !forgotEmail.trim() || forgotCooldown > 0}
              >
                {forgotLoading ? (
                  <><div className="loading-spinner loading-spinner--sm" />Sending Link...</>
                ) : forgotCooldown > 0 ? (
                  `Retry in ${forgotCooldown}s`
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export { Login };
