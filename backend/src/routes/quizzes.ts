import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const quizSchema = z.object({
  topic: z.string().min(1).max(200),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questions: z.array(z.unknown()),
  score: z.number().int().min(0).optional().nullable(),
  total_questions: z.number().int().min(1),
});

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('quizzes')
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
  } catch {
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = quizSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.errors }); return; }
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .insert({ ...parsed.data, user_id: req.userId })
      .select().single();
    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        res.status(503).json({ error: 'Database table not found. Please run the supabase-schema.sql script in your Supabase SQL editor.' });
        return;
      }
      throw error;
    }
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: 'Failed to save quiz' });
  }
});

router.patch('/:id/score', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number') { res.status(400).json({ error: 'Score must be a number' }); return; }
    const { data, error } = await supabaseAdmin
      .from('quizzes')
      .update({ score })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select().single();
    if (error || !data) {
      if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
        res.status(503).json({ error: 'Database table not found. Please run the supabase-schema.sql script in your Supabase SQL editor.' });
        return;
      }
      res.status(404).json({ error: 'Quiz not found' });
      return;
    }
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to update quiz score' });
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);
    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        res.status(503).json({ error: 'Database table not found. Please run the supabase-schema.sql script in your Supabase SQL editor.' });
        return;
      }
      throw error;
    }
    res.json({ message: 'Quiz deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

export { router as quizRoutes };
