import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, Loader, Trash2, CheckSquare, Plus, Check, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { StudyPlan, AIStudyPlan, StudyDay } from '../types';
import { formatDate, formatMinutes } from '../utils/helpers';
import toast from 'react-hot-toast';
import { storage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

interface PlanForm {
  goal: string;
  subjects: string;
  examDate: string;
  hoursPerDay: string;
  sessionDuration: string;
  difficulty: string;
}

const StudyPlanner: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<PlanForm>({
    goal: '', subjects: '', examDate: '', hoursPerDay: '2', sessionDuration: '45', difficulty: 'intermediate',
  });
  const [generating, setGenerating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<AIStudyPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<StudyPlan[]>(() => storage.getStudyPlans(user?.id));
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [addingTasks, setAddingTasks] = useState(false);
  const [addedTasks, setAddedTasks] = useState(false);
  const [addedDays, setAddedDays] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchPlans();
  }, [user?.id]);

  const fetchPlans = async () => {
    const local = storage.getStudyPlans(user?.id);
    setSavedPlans(local);
    try {
      const res = await api.get('/api/study-plans');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSavedPlans(res.data);
      }
    } catch {
      // Local plans remain accessible offline
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.goal || !form.subjects || !form.examDate) {
      toast.error('Please fill in goal, subjects, and exam date');
      return;
    }
    if (!storage.isOnline()) {
      toast.error('AI Study Planner requires an internet connection. Your offline tasks & plans are fully accessible!', {
        duration: 4000,
        icon: '📡',
      });
      return;
    }
    setGenerating(true);
    setCurrentPlan(null);
    setAddedTasks(false);
    setAddedDays({});
    try {
      const res = await api.post('/api/ai/study-plan', {
        goal: form.goal,
        subjects: form.subjects,
        examDate: form.examDate,
        hoursPerDay: parseFloat(form.hoursPerDay),
        sessionDuration: parseInt(form.sessionDuration),
        difficulty: form.difficulty,
      });
      const generatedPlan = res.data.plan;
      setCurrentPlan(generatedPlan);
      setExpandedDay(0);

      // Save locally to device storage immediately
      const savedLocal = storage.saveStudyPlan({
        title: generatedPlan.title || `${form.subjects} Preparation Plan`,
        description: generatedPlan.summary || form.goal,
        start_date: new Date().toISOString().split('T')[0],
        end_date: form.examDate,
        total_minutes: generatedPlan.totalMinutes || (generatedPlan.totalDays || 7) * parseFloat(form.hoursPerDay) * 60,
        plan_data: generatedPlan,
      }, user?.id);

      setSavedPlans(prev => [savedLocal, ...prev]);
      toast.success('Study plan generated and saved to device!');
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
    setAddedTasks(false);
    setAddedDays({});
  };

  const handleConvertPlanToTasks = async () => {
    if (!currentPlan || !currentPlan.days) return;
    setAddingTasks(true);
    try {
      const tasksToCreate: Array<{
        title: string;
        description: string;
        subject: string;
        task_type: 'study' | 'assignment' | 'exam' | 'project' | 'homework';
        priority: 'low' | 'medium' | 'high';
        status: 'pending';
        deadline: string | null;
        estimated_minutes: number | null;
      }> = [];

      currentPlan.days.forEach(day => {
        let deadlineIso: string | null = null;
        if (day.date) {
          try {
            const d = new Date(day.date);
            if (!isNaN(d.getTime())) {
              d.setHours(23, 59, 0, 0);
              deadlineIso = d.toISOString();
            }
          } catch {
            deadlineIso = null;
          }
        }

        (day.activities || []).forEach(act => {
          if (act.type === 'break') return;

          let priority: 'low' | 'medium' | 'high' = 'medium';
          if (act.type === 'review' || act.type === 'practice') priority = 'high';

          tasksToCreate.push({
            title: `[Day ${day.dayNumber}] ${act.title}`,
            description: `${act.description || ''}\n\n• Focus: ${day.focus}\n• Plan: ${currentPlan.title}`,
            subject: act.subject || form.subjects.split(',')[0].trim() || 'General Study',
            task_type: 'study',
            priority,
            status: 'pending',
            deadline: deadlineIso,
            estimated_minutes: act.duration || 45,
          });
        });
      });

      if (tasksToCreate.length === 0) {
        toast.error('No study activities found in this plan to convert');
        return;
      }

      // 1. Immediately store on device (0ms)
      storage.saveBatchTasks(tasksToCreate, user?.id);

      setAddedTasks(true);
      toast.success(`🎉 Added ${tasksToCreate.length} tasks to your Tasks section!`, {
        duration: 4000,
      });
    } catch {
      toast.error('Failed to add plan to tasks');
    } finally {
      setAddingTasks(false);
    }
  };

  const handleAddDayToTasks = async (day: StudyDay, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (addedDays[day.dayNumber]) return;

    try {
      let deadlineIso: string | null = null;
      if (day.date) {
        try {
          const d = new Date(day.date);
          if (!isNaN(d.getTime())) {
            d.setHours(23, 59, 0, 0);
            deadlineIso = d.toISOString();
          }
        } catch {
          deadlineIso = null;
        }
      }

      const dayTasks = (day.activities || [])
        .filter(a => a.type !== 'break')
        .map(act => ({
          title: `[Day ${day.dayNumber}] ${act.title}`,
          description: `${act.description || ''}\n\n• Focus: ${day.focus}\n• Plan: ${currentPlan?.title || 'Study Schedule'}`,
          subject: act.subject || form.subjects.split(',')[0].trim() || 'General Study',
          task_type: 'study' as const,
          priority: (act.type === 'review' || act.type === 'practice' ? 'high' : 'medium') as 'low' | 'medium' | 'high',
          status: 'pending' as const,
          deadline: deadlineIso,
          estimated_minutes: act.duration || 45,
        }));

      if (dayTasks.length === 0) {
        toast.error('No activities found for this day');
        return;
      }

      // 1. Save on device instantly (0ms)
      storage.saveBatchTasks(dayTasks, user?.id);

      setAddedDays(prev => ({ ...prev, [day.dayNumber]: true }));
      toast.success(`Added ${dayTasks.length} tasks for Day ${day.dayNumber}`);
    } catch {
      toast.error('Failed to add tasks for this day');
    }
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

                {/* One-click Action to Add to Tasks */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-4)',
                  paddingTop: 'var(--space-4)',
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <CheckSquare size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {addedTasks ? (
                        'All study activities have been converted to tasks in your workspace.'
                      ) : (
                        `${currentPlan.days?.reduce((sum, d) => sum + (d.activities?.filter(a => a.type !== 'break').length || 0), 0) || 0} study tasks ready to add.`
                      )}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      className={`btn ${addedTasks ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={handleConvertPlanToTasks}
                      disabled={addingTasks || addedTasks}
                      style={{ minWidth: 160 }}
                    >
                      {addingTasks ? (
                        <><Loader size={14} className="spin" /> Adding to Tasks...</>
                      ) : addedTasks ? (
                        <><Check size={14} /> Added to Tasks</>
                      ) : (
                        <><Plus size={14} /> Add Plan to Tasks</>
                      )}
                    </button>

                    {addedTasks && (
                      <Link to="/tasks" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        View in Tasks <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ paddingLeft: 'var(--space-2)' }}>
                {currentPlan.days?.map((day, idx) => (
                  <div key={idx} className="plan-day">
                    <div className="plan-day-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                      <button
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'none', border: 'none', cursor: 'pointer', flex: 1, textAlign: 'left' }}
                        onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                      >
                        <div style={{ flex: 1 }}>
                          <p className="plan-day-date">{day.date ? formatDate(day.date) : `Day ${day.dayNumber}`}</p>
                          <p className="plan-day-focus">{day.focus}</p>
                          <p className="plan-day-time">{formatMinutes(day.totalMinutes)} total</p>
                        </div>
                        {expandedDay === idx ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
                      </button>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12, padding: '4px 10px', height: 'auto', flexShrink: 0, color: addedDays[day.dayNumber] || addedTasks ? 'var(--success)' : 'var(--text-secondary)' }}
                        onClick={(e) => handleAddDayToTasks(day, e)}
                        disabled={addedDays[day.dayNumber] || addedTasks}
                        title="Add this day's activities to your Tasks list"
                      >
                        {addedDays[day.dayNumber] || addedTasks ? (
                          <><Check size={12} /> Day Added</>
                        ) : (
                          <><Plus size={12} /> Add Day</>
                        )}
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
