import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, BookOpen, Bot, Brain, TrendingUp, Settings,
  LogOut, Menu, X, GraduationCap, ChevronRight, type LucideIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface NavGroup {
  label?: string;
  items: {
    to: string;
    icon: LucideIcon;
    label: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { to: '/planner', icon: BookOpen, label: 'Study Planner' },
    ],
  },
  {
    label: 'AI',
    items: [
      { to: '/copilot', icon: Bot, label: 'AI Copilot' },
      { to: '/quiz', icon: Brain, label: 'Quiz Generator' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/progress', icon: TrendingUp, label: 'Progress' },
    ],
  },
];

const mobileBottomNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/planner', icon: BookOpen, label: 'Planner' },
  { to: '/copilot', icon: Bot, label: 'Copilot' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
];

export const AppLayout: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'S';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <GraduationCap size={20} />
            </div>
            <div className="brand-text">
              <span className="brand-name">StudyFlow</span>
              <span className="brand-ai">AI</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="nav-group">
              {group.label && <div className="nav-group-label">{group.label}</div>}
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  <ChevronRight size={14} className="nav-item-arrow" />
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Settings bottom link before user profile */}
        <div className="sidebar-bottom-nav">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <Settings size={18} />
            <span>Settings</span>
            <ChevronRight size={14} className="nav-item-arrow" />
          </NavLink>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <p className="user-name">{firstName}</p>
              <p className="user-email">{profile?.email || ''}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout" aria-label="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top bar for mobile */}
        <header className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="brand brand--mobile">
            <GraduationCap size={18} />
            <span>StudyFlow AI</span>
          </div>
          <div className="user-avatar user-avatar--sm">{initials}</div>
        </header>

        <main className="page-content">
          <div key={location.pathname} className="page-transition-wrapper">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom quick navigation */}
        <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
          {mobileBottomNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `mobile-bottom-link ${isActive ? 'mobile-bottom-link--active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

