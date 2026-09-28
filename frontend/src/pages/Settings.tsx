import React, { useState } from 'react';
import { User, Lock, Save, Loader, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);

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
