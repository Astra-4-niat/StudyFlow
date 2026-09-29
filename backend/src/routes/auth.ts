import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabaseAdmin, supabaseAnon, hasServiceRoleKey } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  securityQuestion: z.string().trim().optional(),
  securityAnswer: z.string().trim().optional(),
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

    const { fullName, email, password, securityQuestion, securityAnswer } = parseResult.data;

    const userMetadata: Record<string, any> = { full_name: fullName };
    if (securityQuestion && securityAnswer) {
      userMetadata.security_question = securityQuestion.trim();
      userMetadata.security_answer = securityAnswer.trim().toLowerCase();
    }

    let newUser: any = null;
    let createError: any = null;

    if (hasServiceRoleKey) {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
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
          data: userMetadata,
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
      token: data.session.access_token,
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

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().trim().email('Please enter a valid email address'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid email address' });
      return;
    }
    const { email } = parsed.data;
    let origin = (req.headers.origin as string) || 'https://studyflowve.vercel.app';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      origin = 'https://studyflowve.vercel.app';
    }

    const redirectTo = `${origin}/reset-password`;

    let directRecoveryUrl: string | null = null;
    let userNotFound = false;

    // 1. Proactively generate a direct verified recovery link via admin API so users are NEVER stranded by undelivered emails
    if (hasServiceRoleKey) {
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo,
          },
        });

        if (linkError) {
          if ((linkError as any)?.code === 'user_not_found' || linkError.message?.toLowerCase().includes('not found')) {
            userNotFound = true;
          } else {
            console.warn('Admin generateLink error:', linkError.message);
          }
        } else if (linkData?.properties?.action_link) {
          directRecoveryUrl = linkData.properties.action_link;
        }
      } catch (adminErr) {
        console.warn('Admin recovery link fallback error:', adminErr);
      }
    }

    if (userNotFound) {
      res.status(404).json({ error: 'No StudyFlow AI account was found with that email address. Please check your spelling or sign up.' });
      return;
    }

    // 2. Try sending password recovery email via Supabase Auth as well
    const { error: emailError } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    const isRateLimit = (emailError as any)?.status === 429 ||
      emailError?.message?.toLowerCase().includes('rate limit') ||
      emailError?.message?.toLowerCase().includes('too many');

    // If we have the direct recovery link, return it immediately so the user can reset without waiting for email delivery
    if (directRecoveryUrl) {
      res.json({
        message: isRateLimit
          ? 'Email provider rate limit reached. We generated a direct recovery link for you below.'
          : 'Password recovery initiated. Use the direct recovery link below if your email is delayed.',
        recoveryUrl: directRecoveryUrl,
        rateLimited: isRateLimit,
        emailSent: !emailError,
      });
      return;
    }

    if (!emailError) {
      res.json({ message: 'Password reset link sent successfully. Please check your inbox and spam folder.' });
      return;
    }

    if (isRateLimit) {
      res.status(429).json({
        error: 'Email provider rate limit exceeded (maximum 3 emails/hour). Please check your inbox or spam for any recovery email already sent, or wait a few minutes before trying again.',
        rateLimited: true,
      });
      return;
    }

    res.status(400).json({ error: emailError?.message || 'Unable to send password reset email.' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Unable to process password reset. Please try again later.' });
  }
});

// POST /api/auth/get-security-question
router.post('/get-security-question', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!hasServiceRoleKey) {
      res.status(503).json({ error: 'Security question verification is temporarily unavailable.' });
      return;
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      res.status(500).json({ error: 'Failed to look up user account.' });
      return;
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      res.status(404).json({ error: 'No StudyFlow AI account found with this email address.' });
      return;
    }

    const question = targetUser.user_metadata?.security_question;
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.json({
        hasSecurityQuestion: false,
        email: cleanEmail,
        message: 'No security question is configured for this account.',
      });
      return;
    }

    res.json({
      hasSecurityQuestion: true,
      question: question.trim(),
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error('get-security-question error:', err);
    res.status(500).json({ error: 'Internal server error while fetching security question.' });
  }
});

// POST /api/auth/reset-with-security-question
router.post('/reset-with-security-question', async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().trim().email('Please enter a valid email address'),
      answer: z.string().trim().min(1, 'Please provide the answer to your security question'),
      newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
      return;
    }

    const { email, answer, newPassword } = parsed.data;
    const cleanEmail = email.toLowerCase();

    if (!hasServiceRoleKey) {
      res.status(503).json({ error: 'Password reset via security question is temporarily unavailable.' });
      return;
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) {
      res.status(500).json({ error: 'Failed to look up user account.' });
      return;
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      res.status(404).json({ error: 'No StudyFlow AI account found with this email address.' });
      return;
    }

    const storedAnswer = targetUser.user_metadata?.security_answer;
    if (!storedAnswer || typeof storedAnswer !== 'string') {
      res.status(400).json({ error: 'No security question configured for this account. Please use the direct recovery link instead.' });
      return;
    }

    // Normalized comparison (case-insensitive and trimmed)
    if (storedAnswer.trim().toLowerCase() !== answer.trim().toLowerCase()) {
      res.status(400).json({ error: 'Incorrect answer. Please check your spelling and try again.' });
      return;
    }

    // Update password directly using Supabase Admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateError) {
      res.status(500).json({ error: updateError.message || 'Failed to update password.' });
      return;
    }

    res.json({
      success: true,
      message: 'Password updated successfully! You can now sign in with your new password.',
    });
  } catch (err: any) {
    console.error('reset-with-security-question error:', err);
    res.status(500).json({ error: 'Internal server error while resetting password.' });
  }
});

// POST /api/auth/set-security-question (authenticated)
router.post('/set-security-question', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      question: z.string().trim().min(3, 'Security question must be at least 3 characters').max(200),
      answer: z.string().trim().min(1, 'Security answer is required').max(200),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
      return;
    }

    const { question, answer } = parsed.data;

    if (!hasServiceRoleKey) {
      res.status(503).json({ error: 'Admin service key required to update security question.' });
      return;
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(req.userId!);
    if (userError || !user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const updatedMetadata = {
      ...(user.user_metadata || {}),
      security_question: question,
      security_answer: answer.trim().toLowerCase(),
    };

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.userId!, {
      user_metadata: updatedMetadata,
    });

    if (updateError) {
      res.status(500).json({ error: updateError.message || 'Failed to save security question.' });
      return;
    }

    res.json({
      success: true,
      message: 'Security question saved successfully!',
      question,
    });
  } catch (err: any) {
    console.error('set-security-question error:', err);
    res.status(500).json({ error: 'Failed to update security question.' });
  }
});

// GET /api/auth/my-security-question (authenticated)
router.get('/my-security-question', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasServiceRoleKey) {
      res.json({ question: null });
      return;
    }
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(req.userId!);
    res.json({
      question: user?.user_metadata?.security_question || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch security question' });
  }
});

export const authRoutes = router;
