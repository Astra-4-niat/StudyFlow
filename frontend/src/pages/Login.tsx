import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Login: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
            <label className="form-label">Password</label>
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
    </div>
  );
};

export { Login };
