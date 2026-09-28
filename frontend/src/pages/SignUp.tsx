import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const SignUp: React.FC = () => {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
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
      await signUp(form.email, form.password, form.fullName);
      toast.success('Account created! Welcome to StudyFlow AI 🎉');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

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
