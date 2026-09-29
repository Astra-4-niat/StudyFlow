import React, { useState, useEffect, useRef } from 'react';
import { User, Lock, Save, Loader, BookOpen, ShieldCheck, CheckCircle, Smartphone, Database, Download, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import { SECURITY_QUESTIONS } from './SignUp';
import toast from 'react-hot-toast';
import { storage } from '../lib/storage';

const Settings: React.FC = () => {
  const { profile, refreshProfile, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  // Local storage stats
  const [storageStats, setStorageStats] = useState(() => storage.getStorageStats(user?.id));

  // Security question state
  const [currentSq, setCurrentSq] = useState('');
  const [selectedSq, setSelectedSq] = useState(SECURITY_QUESTIONS[0]);
  const [sqAnswer, setSqAnswer] = useState('');
  const [savingSq, setSavingSq] = useState(false);

  const handleExportData = () => {
    const jsonStr = storage.exportAllData(user?.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studyflow_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded to device!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && storage.importAllData(content, user?.id)) {
        toast.success('Data imported successfully!');
        setStorageStats(storage.getStorageStats(user?.id));
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    api.get('/api/auth/my-security-question')
      .then(res => {
        if (res.data?.question) {
          setCurrentSq(res.data.question);
          setSelectedSq(res.data.question);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sqAnswer.trim()) {
      toast.error('Please enter a secret answer');
      return;
    }
    setSavingSq(true);
    try {
      await api.post('/api/auth/set-security-question', {
        question: selectedSq,
        answer: sqAnswer.trim(),
      });
      setCurrentSq(selectedSq);
      setSqAnswer('');
      toast.success('Security question updated successfully!');
    } catch (err: any) {
      toast.error(err?.data?.error || err.message || 'Failed to update security question');
    } finally {
      setSavingSq(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq('user_id', profile?.user_id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    if (passwords.new.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      setPasswords({ current: '', new: '', confirm: '' });
      toast.success('Password changed!');
    } catch { toast.error('Failed to change password'); }
    finally { setSavingPassword(false); }
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      <div style={{ maxWidth: 600 }}>
        {/* Profile */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div style={{ width: 40, height: 40, background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="section-title">Profile Information</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: 60, height: 60, background: 'linear-gradient(135deg, var(--accent), #a855f7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S'}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{profile?.full_name}</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{profile?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={profile?.email || ''} disabled style={{ opacity: 0.6 }} />
              <p className="form-error" style={{ color: 'var(--text-muted)' }}>Email cannot be changed</p>
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={savingProfile}>
              {savingProfile ? <><Loader size={15} className="spin" />Saving...</> : <><Save size={15} />Save Profile</>}
            </button>
          </form>
        </div>

        {/* Security */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div style={{ width: 40, height: 40, background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} style={{ color: 'var(--warning)' }} />
            </div>
            <h2 className="section-title">Security</h2>
          </div>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="At least 6 characters" autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Confirm new password" autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} disabled={savingPassword}>
              {savingPassword ? <><Loader size={15} className="spin" />Changing...</> : <><Lock size={15} />Change Password</>}
            </button>
          </form>
        </div>

        {/* Security Question & Account Recovery */}
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ width: 40, height: 40, background: 'rgba(56, 189, 248, 0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="section-title">Account Recovery & Security Question</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                Allows you to reset your password instantly if email delivery is unavailable
              </p>
            </div>
          </div>

          {currentSq && (
            <div style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 'var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
            }}>
              <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Question: </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentSq}</strong>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveSecurityQuestion} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Security Question</label>
              <select
                className="form-input"
                value={selectedSq}
                onChange={e => setSelectedSq(e.target.value)}
              >
                {SECURITY_QUESTIONS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Security Answer</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your secret answer"
                value={sqAnswer}
                onChange={e => setSqAnswer(e.target.value)}
                required
              />
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Answers are case-insensitive.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={savingSq || !sqAnswer.trim()}
            >
              {savingSq ? <><Loader size={15} className="spin" />Saving...</> : <><Save size={15} />Save Security Question</>}
            </button>
          </form>
        </div>

        {/* Preferences */}
        <div className="card" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div style={{ width: 40, height: 40, background: 'var(--accent-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="section-title">Preferences</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Customize your study environment</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Interface Theme</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Current appearance mode</p>
              </div>
              <span className="badge badge-medium">Dark Mode (Default)</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Deadline Notifications</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>In-app alerts for tasks due within 48 hours</p>
              </div>
              <span className="badge badge-completed">Enabled</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Default Study Session Length</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Recommended interval for Pomodoro sessions</p>
              </div>
              <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>45 minutes</span>
            </div>
          </div>
        </div>

        {/* Mobile & Android App Card */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.2))', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="section-title">Android & Mobile App</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Install StudyFlow AI on your phone as a native app</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>App Status</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Progressive Web App (WebAPK) & offline shell</p>
              </div>
              <span className="badge badge-completed">
                <CheckCircle size={12} style={{ display: 'inline', marginRight: 4 }} /> Ready to Install
              </span>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                How to install on Android:
              </p>
              <ol style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.6, margin: 0 }}>
                <li>Open <strong>studyflowve.vercel.app</strong> in Chrome on your Android phone.</li>
                <li>Tap the <strong>"Install StudyFlow AI App"</strong> banner at the bottom (or tap the <strong>⋮</strong> menu at top right and choose <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>).</li>
                <li>StudyFlow AI will be minted directly as an Android app with its own launcher icon, full-screen view, and offline caching.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Device Storage & Data Backup Card */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(56, 189, 248, 0.2))', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="section-title">Device Storage & Offline Speed</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tasks and study records are saved directly in phone/device storage for instant 0ms loads</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{storageStats.taskCount}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tasks Saved</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{storageStats.planCount}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Study Plans</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{storageStats.sessionCount}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Study Sessions</span>
            </div>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{storageStats.quizCount}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Quizzes</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportData}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} /> Download Backup (.json)
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={14} /> Restore from Backup
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportFile}
            />
          </div>
        </div>

        {/* Account / Danger Zone */}
        <div className="card" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <h2 className="section-title">Account</h2>
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Sign out of your active StudyFlow AI session on this device.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success('Signed out');
              window.location.href = '/';
            }}
          >
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
};

export { Settings };
