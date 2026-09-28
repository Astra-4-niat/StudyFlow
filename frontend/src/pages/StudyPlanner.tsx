import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Loader, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { StudyPlan, AIStudyPlan } from '../types';
import { formatDate, formatMinutes } from '../utils/helpers';
import toast from 'react-hot-toast';

interface PlanForm {
  goal: string;
  subjects: string;
  examDate: string;
  hoursPerDay: string;
  sessionDuration: string;
  difficulty: string;
}

const StudyPlanner: React.FC = () => {
  const [form, setForm] = useState<PlanForm>({
    goal: '', subjects: '', examDate: '', hoursPerDay: '2', sessionDuration: '45', difficulty: 'intermediate',
  });
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<AIStudyPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<StudyPlan[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/api/study-plans');
      setSavedPlans(Array.isArray(res.data) ? res.data : []);
    } catch { }

  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.goal || !form.subjects || !form.examDate) {
      toast.error('Please fill in goal, subjects, and exam date');
      return;
    }
    setGenerating(true);
    setCurrentPlan(null);
    try {
      const res = await api.post('/api/ai/study-plan', {
        goal: form.goal,
        subjects: form.subjects,
        examDate: form.examDate,
        hoursPerDay: parseFloat(form.hoursPerDay),
        sessionDuration: parseInt(form.sessionDuration),
        difficulty: form.difficulty,
      });
      setCurrentPlan(res.data.plan);
      setExpandedDay(0);
      if (res.data.saved) {
        setSavedPlans(prev => [res.data.saved, ...prev]);
        toast.success('Study plan generated and saved!');
      } else {
        toast.success('Study plan generated!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/study-plans/${id}`);
      setSavedPlans(prev => prev.filter(p => p.id !== id));
      toast.success('Study plan deleted');
    } catch { toast.error('Failed to delete study plan'); }
  };

  const loadSavedPlan = (plan: StudyPlan) => {
    setCurrentPlan(plan.plan_data as AIStudyPlan);
    setExpandedDay(0);
  };

  const update = (k: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const activityColors: Record<string, string> = { study: 'activity-type-study', review: 'activity-type-review', practice: 'activity-type-practice', break: 'activity-type-break' };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Study Planner</h1>
          <p className="page-subtitle">Turn your goals into a realistic study schedule.</p>
        </div>
      </div>

      <div className="planner-layout-grid">
        {/* Form */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="section-title">Generate Plan</h2>
            </div>
            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Study Goal *</label>
                <input className="form-input" value={form.goal} onChange={update('goal')} placeholder="e.g. Prepare for Physics exam" required />
              </div>
              <div className="form-group">
                <label className="form-label">Subjects / Topics *</label>
                <textarea className="form-input form-textarea" value={form.subjects} onChange={update('subjects')} placeholder="e.g. Electrostatics, Magnetism, Current Electricity" style={{ minHeight: 60 }} required />
              </div>
              <div className="form-group">
                <label className="form-label">Exam / Target Date *</label>
                <input className="form-input" type="date" value={form.examDate} onChange={update('examDate')} min={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Hours/Day</label>
                  <select className="form-input form-select" value={form.hoursPerDay} onChange={update('hoursPerDay')}>
                    {['0.5', '1', '1.5', '2', '3', '4', '5', '6'].map(h => <option key={h} value={h}>{h}h</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Session Length</label>
                  <select className="form-input form-select" value={form.sessionDuration} onChange={update('sessionDuration')}>
                    {[25, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m}min</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Difficulty Level</label>
                <select className="form-input form-select" value={form.difficulty} onChange={update('difficulty')}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={generating} style={{ width: '100%' }}>
                {generating ? <><Loader size={16} className="spin" />Generating with AI...</> : <><Sparkles size={16} />Generate Study Plan</>}
              </button>
            </form>
          </div>

          {/* Saved Plans */}
          {savedPlans.length > 0 && (
            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <h3 className="section-title" style={{ marginBottom: 'var(--space-4)', fontSize: 15 }}>Saved Plans</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {savedPlans.map(plan => (
                  <div key={plan.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <button onClick={() => loadSavedPlan(plan)} style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{plan.title}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(plan.created_at)}</p>
                    </button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(plan.id)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Plan display */}
        <div>
          {generating && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Generating your study plan...</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gemini AI is analyzing your schedule and creating a personalized plan</p>
            </div>
          )}

          {currentPlan && !generating && (
            <div>
              <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                  <div>
                    <div className="ai-badge" style={{ marginBottom: 'var(--space-2)' }}>✨ AI Generated</div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{currentPlan.title}</h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{currentPlan.summary}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-4)', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{currentPlan.totalDays}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Days</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{Math.floor(currentPlan.totalMinutes / 60)}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ paddingLeft: 'var(--space-2)' }}>
                {currentPlan.days?.map((day, idx) => (
                  <div key={idx} className="plan-day">
                    <div className="plan-day-header">
                      <button
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                        onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                      >
                        <div style={{ flex: 1 }}>
                          <p className="plan-day-date">{day.date ? formatDate(day.date) : `Day ${day.dayNumber}`}</p>
                          <p className="plan-day-focus">{day.focus}</p>
                          <p className="plan-day-time">{formatMinutes(day.totalMinutes)} total</p>
                        </div>
                        {expandedDay === idx ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                      </button>
                    </div>

                    {expandedDay === idx && (
                      <div style={{ marginTop: 'var(--space-3)' }}>
                        {day.activities?.map((activity, aIdx) => (
                          <div key={aIdx} className="plan-activity">
                            <div className={`activity-type-dot ${activityColors[activity.type] || 'activity-type-study'}`} />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{activity.title}</p>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{activity.duration}min</span>
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{activity.description}</p>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{activity.subject} · {activity.type}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!currentPlan && !generating && (
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={28} /></div>
              <p className="empty-state-title">No study plan yet</p>
              <p className="empty-state-text">Fill in your goal, subjects, and exam date, then click "Generate Study Plan" to create a personalized plan with Gemini AI.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { StudyPlanner };
