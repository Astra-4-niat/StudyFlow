import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const studyPlanSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().default(''),
  start_date: z.string(),
  end_date: z.string(),
  total_minutes: z.number().int().min(0).optional().default(0),
  plan_data: z.record(z.unknown()).optional().default({}),
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_plans')
      .select('*')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false });
    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        res.json([]);
        return;
      }
      throw error;
    }
    res.json(data || []);
  } catch (err: any) {
    console.error('Failed to fetch study plans:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch study plans' });
  }
});

router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_plans')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (error || !data) { res.status(404).json({ error: 'Study plan not found' }); return; }
    res.json(data);
  } catch (err: any) {
    console.error('Failed to fetch study plan:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch study plan' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = studyPlanSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.errors }); return; }
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_plans')
      .insert({ ...parsed.data, user_id: req.userId })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Failed to save study plan:', err);
    res.status(500).json({ error: err?.message || 'Failed to save study plan' });
  }
});

const handleUpdateStudyPlan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = studyPlanSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.errors }); return; }
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('study_plans')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select().single();
    if (error || !data) { res.status(404).json({ error: 'Study plan not found' }); return; }
    res.json(data);
  } catch (err: any) {
    console.error('Failed to update study plan:', err);
    res.status(500).json({ error: err?.message || 'Failed to update study plan' });
  }
};

router.put('/:id', handleUpdateStudyPlan);
router.patch('/:id', handleUpdateStudyPlan);

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { error } = await db
      .from('study_plans')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) throw error;
    res.json({ message: 'Study plan deleted' });
  } catch (err: any) {
    console.error('Failed to delete study plan:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete study plan' });
  }
});

export { router as studyPlanRoutes };
