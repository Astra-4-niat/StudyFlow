import axios from 'axios';
import { supabase } from './supabase';

const rawApiUrl = import.meta.env.VITE_API_URL;
// Defensively normalize: if user provided a URL ending with /api, strip it since routes already include /api
let cleanApiUrl = (rawApiUrl || '').trim().replace(/\/+$/, '');
if (cleanApiUrl.endsWith('/api')) {
  cleanApiUrl = cleanApiUrl.slice(0, -4);
}

// In production, ignore any localhost URL that may have been copied from local .env to Vercel env settings
const isLocalhost = cleanApiUrl.includes('localhost') || cleanApiUrl.includes('127.0.0.1');
const API_URL = cleanApiUrl && (!isLocalhost || import.meta.env.DEV)
  ? cleanApiUrl
  : (import.meta.env.DEV ? 'http://localhost:3001' : '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

export interface CustomApiError extends Error {
  status?: number;
  data?: unknown;
}

// Attach Supabase JWT to every request
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // If auth session fetch fails, continue without bearer
  }
  return config;
});

// Global error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return Promise.reject(new Error('Request timed out. Please try again.'));
      }
      return Promise.reject(new Error('Unable to connect to StudyFlow AI backend. Please check your connection.'));
    }
    const status = error.response.status;
    const serverError = error.response.data?.error;
    let message = serverError;
    if (!message) {
      if (status === 401) message = 'Your session has expired. Please sign in again.';
      else if (status === 400) message = 'Please check your input and try again.';
      else if (status === 429) message = 'AI request limit reached. Please try again shortly.';
      else if (status === 500) message = 'AI service is temporarily unavailable.';
      else message = 'Something went wrong. Please try again.';
    }
    const err: CustomApiError = Object.assign(new Error(message), {
      status,
      data: error.response.data,
    });
    return Promise.reject(err);
  }
);

export default api;
