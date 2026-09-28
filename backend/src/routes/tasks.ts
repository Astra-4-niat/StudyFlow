import { Router, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const taskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().default(''),
  subject: z.string().min(1).max(100),
  task_type: z.enum(['assignment', 'exam', 'project', 'homework', 'study']),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
  deadline: z.string().optional().nullable(),
  estimated_minutes: z.number().int().min(0).optional().nullable(),
});

// GET /api/tasks
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { status, priority, task_type, sort = 'created_at', order = 'desc' } = req.query;
    
    let query = db
      .from('tasks')
      .select('*')
      .eq('user_id', req.userId!);

    if (status) query = query.eq('status', status as string);
    if (priority) query = query.eq('priority', priority as string);
    if (task_type) query = query.eq('task_type', task_type as string);

    const validSortCols = ['created_at', 'deadline', 'priority', 'updated_at'];
    const sortCol = validSortCols.includes(sort as string) ? (sort as string) : 'created_at';
    query = query.order(sortCol, { ascending: order === 'asc' });

    const { data, error } = await query;
    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        res.json([]);
        return;
      }
      throw error;
    }
    res.json(data || []);
  } catch (err: any) {
    console.error('Failed to fetch tasks:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .single();
    if (error || !data) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(data);
  } catch (err: any) {
    console.error('Failed to fetch task:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch task' });
  }
});

// POST /api/tasks
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('tasks')
      .insert({ ...parsed.data, user_id: req.userId })
      .select()
      .single();
    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        res.status(503).json({ error: 'Database table not found. Please run the supabase-schema.sql script in your Supabase SQL editor.' });
        return;
      }
      throw error;
    }
    res.status(201).json(data);
  } catch (err: any) {
    console.error('Failed to create task:', err);
    res.status(500).json({ error: err?.message || 'Failed to create task' });
  }
});

// PUT /api/tasks/:id and PATCH /api/tasks/:id
const handleUpdateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = taskSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.errors });
      return;
    }
    const db = req.supabase || supabaseAdmin;
    const { data, error } = await db
      .from('tasks')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .single();
    if (error || !data) {
      if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
        res.status(503).json({ error: 'Database table not found. Please run the supabase-schema.sql script in your Supabase SQL editor.' });
        return;
      }
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(data);
  } catch (err: any) {
    console.error('Failed to update task:', err);
    res.status(500).json({ error: err?.message || 'Failed to update task' });
  }
};

router.put('/:id', handleUpdateTask);
router.patch('/:id', handleUpdateTask);

// DELETE /api/tasks/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { error } = await db
      .from('tasks')
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
    res.json({ message: 'Task deleted' });
  } catch (err: any) {
    console.error('Failed to delete task:', err);
    res.status(500).json({ error: err?.message || 'Failed to delete task' });
  }
});

export { router as taskRoutes };
