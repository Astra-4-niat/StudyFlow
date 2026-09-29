import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, CheckCircle, KeyRound, ExternalLink,
  Copy, Clock, ShieldCheck, ArrowRight, ArrowLeft
} from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
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

  // Password Recovery modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState<'question' | 'link'>('question');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotRecoveryUrl, setForgotRecoveryUrl] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState('');
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Security question recovery state
  const [sqStep, setSqStep] = useState<'email' | 'answer'>('email');
  const [sqQuestion, setSqQuestion] = useState('');
  const [sqAnswer, setSqAnswer] = useState('');
  const [sqNewPassword, setSqNewPassword] = useState('');
  const [sqConfirmPassword, setSqConfirmPassword] = useState('');
  const [sqSuccess, setSqSuccess] = useState(false);

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

  const handleOpenForgotModal = () => {
    setForgotEmail(email);
    setForgotSent(false);
    setForgotRecoveryUrl(null);
    setForgotError('');
    setRecoveryMode('question');
    setSqStep('email');
    setSqQuestion('');
    setSqAnswer('');
    setSqNewPassword('');
    setSqConfirmPassword('');
    setSqSuccess(false);
    setShowForgotModal(true);
  };

  // Step 1: Find security question for email
  const handleFindSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setForgotError('Please enter your email address');
      return;
    }
    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await api.post('/api/auth/get-security-question', { email: cleanEmail });
      if (res.data?.hasSecurityQuestion && res.data?.question) {
        setSqQuestion(res.data.question);
        setSqStep('answer');
      } else {
        // User has no security question set, so automatically generate the instant recovery link
        toast('No security question configured. Generating instant reset link...', { icon: '⚡' });
        try {
          const linkRes = await api.post('/api/auth/forgot-password', { email: cleanEmail });
          if (linkRes.data?.recoveryUrl) {
            setForgotRecoveryUrl(linkRes.data.recoveryUrl);
            setRecoveryMode('link');
            toast.success('Instant recovery link ready!');
          } else {
            setForgotSent(true);
            setRecoveryMode('link');
          }
        } catch (linkErr: any) {
          setForgotError(linkErr?.data?.error || linkErr?.message || 'Unable to generate reset link.');
        }
      }
    } catch (err: any) {
      setForgotError(err?.data?.error || err?.message || 'Failed to find account. Please check the email entered.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Submit security answer and new password
  const handleResetWithSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqAnswer.trim()) {
      setForgotError('Please enter the answer to your security question');
      return;
    }
    if (sqNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters');
      return;
    }
    if (sqNewPassword !== sqConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      await api.post('/api/auth/reset-with-security-question', {
        email: forgotEmail.trim(),
        answer: sqAnswer.trim(),
        newPassword: sqNewPassword,
      });
      setSqSuccess(true);
      toast.success('Password changed successfully! 🎉');
    } catch (err: any) {
      setForgotError(err?.data?.error || err?.message || 'Incorrect answer or failed to update password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Direct Recovery Link submit
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
      const res = await api.post('/api/auth/forgot-password', { email: cleanEmail });
      if (res.data?.recoveryUrl) {
        setForgotRecoveryUrl(res.data.recoveryUrl);
        toast.success('Instant recovery link generated!');
      } else {
        setForgotSent(true);
        toast.success('Password reset email sent!');
      }
    } catch (backendErr: any) {
      const serverMsg = backendErr?.data?.error || backendErr?.message || '';
      const isRateLimit = backendErr?.status === 429 || serverMsg.toLowerCase().includes('rate limit');

      if (isRateLimit) {
        setForgotCooldown(60);
        setForgotError('Email provider limit reached (3 emails/hour). If you have a security question set, switch to the "Security Question" tab above for instant reset.');
        toast.error('Email rate limit reached.');
        return;
      }

      // Fallback: direct Supabase call
      try {
        await resetPassword(cleanEmail);
        setForgotSent(true);
        toast.success('Password reset email sent!');
      } catch (clientErr: any) {
        const clientMsg = clientErr instanceof Error ? clientErr.message : 'Failed to send reset link';
        setForgotError(clientMsg);
        toast.error(clientMsg);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '24px', textDecoration: 'none' }}>
            <BrandLogo size="lg" />
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
                onClick={handleOpenForgotModal}
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

      {/* Password Recovery Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Password"
        size="sm"
      >
        {sqSuccess ? (
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
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              Your password has been securely updated. You can now sign in immediately with your new password.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={() => setShowForgotModal(false)}
            >
              Sign In Now
            </button>
          </div>
        ) : forgotRecoveryUrl ? (
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
              Direct Recovery Link Ready
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-5)' }}>
              We generated an instant, verified password recovery session for <strong>{forgotEmail}</strong>. You do not need to wait for an email!
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
                Reset Password Directly
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
                onClick={() => {
                  setForgotRecoveryUrl(null);
                  setRecoveryMode('question');
                }}
              >
                Try Security Question Instead
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
              Recovery Link Dispatched
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-5)' }}>
              A reset link was sent to <strong>{forgotEmail}</strong>. If email delivery is delayed by your mail provider, you can reset instantly using your security question below.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%' }}
                onClick={() => {
                  setForgotSent(false);
                  setRecoveryMode('question');
                }}
              >
                <ShieldCheck size={16} style={{ marginRight: 6 }} />
                Reset via Security Question
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: 13 }}
                onClick={() => setShowForgotModal(false)}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Mode Switcher Tabs */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-elevated)',
              padding: '3px',
              borderRadius: 'var(--radius-sm, 8px)',
              marginBottom: 'var(--space-4)',
            }}>
              <button
                type="button"
                onClick={() => { setRecoveryMode('question'); setForgotError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  background: recoveryMode === 'question' ? 'var(--surface)' : 'transparent',
                  color: recoveryMode === 'question' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: recoveryMode === 'question' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 160ms ease',
                }}
              >
                <ShieldCheck size={14} /> Security Question
              </button>
              <button
                type="button"
                onClick={() => { setRecoveryMode('link'); setForgotError(''); }}
                style={{
                  flex: 1,
                  padding: '7px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  background: recoveryMode === 'link' ? 'var(--surface)' : 'transparent',
                  color: recoveryMode === 'link' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: recoveryMode === 'link' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 160ms ease',
                }}
              >
                <KeyRound size={14} /> Instant Reset Link
              </button>
            </div>

            {/* Error / Cooldown Alert */}
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

            {/* TAB 1: Security Question Mode */}
            {recoveryMode === 'question' ? (
              sqStep === 'email' ? (
                <form onSubmit={handleFindSecurityQuestion}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                    Enter your email to answer your registered security question and reset your password instantly.
                  </p>

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
                      disabled={forgotLoading || !forgotEmail.trim()}
                    >
                      {forgotLoading ? (
                        <><div className="loading-spinner loading-spinner--sm" />Checking...</>
                      ) : (
                        <>Continue <ArrowRight size={14} style={{ marginLeft: 4 }} /></>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetWithSecurityQuestion}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-3)' }}>
                    <button
                      type="button"
                      onClick={() => setSqStep('email')}
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', height: 28, fontSize: 12 }}
                    >
                      <ArrowLeft size={13} style={{ marginRight: 4 }} /> Back
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Account: <strong>{forgotEmail}</strong>
                    </span>
                  </div>

                  {/* Question Display Card */}
                  <div style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    marginBottom: 'var(--space-4)',
                  }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Your Security Question
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {sqQuestion}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                    <label className="form-label">Your Answer</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Enter secret answer"
                      value={sqAnswer}
                      onChange={e => setSqAnswer(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                    <label className="form-label">New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="At least 6 characters"
                      value={sqNewPassword}
                      onChange={e => setSqNewPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 'var(--space-5)' }}>
                    <label className="form-label">Confirm New Password</label>
                    <input
                      className="form-input"
                      type="password"
                      placeholder="Confirm new password"
                      value={sqConfirmPassword}
                      onChange={e => setSqConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
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
                      disabled={forgotLoading || !sqAnswer.trim() || !sqNewPassword}
                    >
                      {forgotLoading ? (
                        <><div className="loading-spinner loading-spinner--sm" />Updating...</>
                      ) : (
                        'Reset Password Instantly'
                      )}
                    </button>
                  </div>
                </form>
              )
            ) : (
              /* TAB 2: Instant Reset Link Mode */
              <form onSubmit={handleForgotSubmit}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-4)' }}>
                  Generates an authenticated password recovery session directly on your screen so you can reset immediately even if emails are delayed.
                </p>

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
                      <><div className="loading-spinner loading-spinner--sm" />Generating Link...</>
                    ) : forgotCooldown > 0 ? (
                      `Retry in ${forgotCooldown}s`
                    ) : (
                      'Generate Instant Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export { Login };
