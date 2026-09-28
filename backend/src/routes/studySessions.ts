import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const sessionSchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  study_plan_id: z.string().uuid().optional().nullable(),
  subject: z.string().min(1).max(100),
  duration_minutes: z.number().int().min(1),
  completed_at: z.string().optional(),
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_sessions')
      .select('*')
      .eq('user_id', req.userId!)
      .order('completed_at', { ascending: false })
      .limit(50);
    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        res.json([]);
        return;
      }
      throw error;
    }
    res.json(data || []);
  } catch (err: any) {
    console.error('Failed to fetch study sessions:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch study sessions' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.errors }); return; }
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_sessions')
      .insert({
        ...parsed.data,
        user_id: req.userId,
        completed_at: parsed.data.completed_at || new Date().toISOString(),
      })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Failed to save study session:', err);
    res.status(500).json({ error: err?.message || 'Failed to save study session' });
  }
});

const handleUpdateSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = sessionSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.errors }); return; }
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_sessions')
      .update(parsed.data)
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select().single();
    if (error || !data) { res.status(404).json({ error: 'Study session not found' }); return; }
    res.json(data);
  } catch (err: any) {
    console.error('Failed to update study session:', err);
    res.status(500).json({ error: err?.message || 'Failed to update study session' });
  }
};

router.put('/:id', handleUpdateSession);
router.patch('/:id', handleUpdateSession);

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { error } = await db
      .from('study_sessions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    res.json({ message: 'Session deleted' });
  } catch (err: any) {
    console.error('Failed to delete session:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete session' });
  }
});

export { router as studySessionRoutes };
