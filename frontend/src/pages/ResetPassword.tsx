import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import './Auth.css';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Listen for password recovery auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        toast('Ready to set your new password', { icon: '🔑' });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password. Your reset link may have expired.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '24px', textDecoration: 'none' }}>
            <BrandLogo size="lg" />
          </Link>
          <h1 className="auth-title">Create New Password</h1>
          <p className="auth-subtitle">Enter your new secure password below</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)',
              color: 'var(--success, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-4)',
            }}>
              <CheckCircle size={30} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-6)' }}>
              Your password has been securely updated. Redirecting you to your workspace...
            </p>
            <Link to="/dashboard" className="btn btn-primary" style={{ width: '100%' }}>
              Go to Dashboard Now
            </Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  className="form-input input-with-icon-field"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="new-password"
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-with-icon">
                <Lock size={16} className="input-icon" />
                <input
                  className="form-input input-with-icon-field"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-2)' }} disabled={loading}>
              {loading ? <><div className="loading-spinner loading-spinner--sm" />Saving Password...</> : 'Set New Password'}
            </button>

            <p className="auth-switch" style={{ marginTop: 'var(--space-5)' }}>
              Remember your password? <Link to="/login">Back to Sign In</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
