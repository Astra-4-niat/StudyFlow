import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, supabaseAnon, hasServiceRoleKey } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/signup and /api/auth/register
router.post(['/signup', '/register'], async (req: Request, res: Response) => {
  try {
    const parseResult = signupSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data';
      res.status(400).json({ error: firstError });
      return;
    }

    const { fullName, email, password } = parseResult.data;

    let newUser: any = null;
    let createError: any = null;

    if (hasServiceRoleKey) {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      newUser = result.data?.user;
      createError = result.error;
    }

    // Fallback if admin key wasn't set or admin creation was rejected
    if (!newUser && (!hasServiceRoleKey || createError?.status === 401 || createError?.status === 403)) {
      const anonResult = await supabaseAnon.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      newUser = anonResult.data?.user;
      createError = anonResult.error;
    }

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || createError.status === 422) {
        res.status(409).json({ error: 'An account with this email already exists. Try signing in.' });
        return;
      }
      if (msg.includes('password') || msg.includes('weak')) {
        res.status(400).json({ error: 'Password must meet the required security requirements (at least 6 characters).' });
        return;
      }
      res.status(400).json({ error: createError.message || 'Unable to create account. Please check your details.' });
      return;
    }

    if (!newUser) {
      res.status(500).json({ error: 'User creation failed. Please try again.' });
      return;
    }

    // Attempt to create or upsert profile in public.profiles table
    try {
      await supabaseAdmin.from('profiles').upsert({
        user_id: newUser.id,
        full_name: fullName,
        email: email,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (profileErr) {
      // Non-fatal if table not yet migrated, user auth record still succeeded
      console.warn('Profile record creation deferred:', profileErr instanceof Error ? profileErr.message : profileErr);
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Unable to process signup. Please try again later.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]?.message || 'Invalid input data';
      res.status(400).json({ error: firstError });
      return;
    }

    const { email, password } = parseResult.data;

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      res.status(401).json({ error: 'Invalid email or password. Please try again.' });
      return;
    }

    res.json({
      message: 'Signed in successfully',
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name || '',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Unable to process sign in. Please try again later.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = req.supabase || supabaseAdmin;
    const { data: profile } = await db.from('profiles').select('*').eq('user_id', req.userId!).maybeSingle();
    res.json({
      user: {
        id: req.userId,
        email: req.userEmail,
        profile: profile || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch current user' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ message: 'Signed out successfully' });
});

export const authRoutes = router;
