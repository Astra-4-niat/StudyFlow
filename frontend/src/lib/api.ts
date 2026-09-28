import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.DEV ? 'http://localhost:3001' : '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: { 'Content-Type': 'application/json' },
});

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
    const err = new Error(message);
    (err as any).status = status;
    (err as any).data = error.response.data;
    return Promise.reject(err);
  }
);

export default api;
