import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl,
  keyLength: supabaseAnonKey?.length,
  keyPreview: supabaseAnonKey?.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const apiService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('Attempting login with Supabase URL:', supabaseUrl);
      console.log('Login attempt for email:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        throw new Error(error.message);
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no session returned');
      }

      console.log('Login successful!');
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || 'User',
        },
        token: data.session.access_token,
      };
    } catch (error) {
      console.error('Login catch block error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to authentication server. Please check your internet connection or verify the Supabase URL is correct.');
      }
      throw error;
    }
  },

  async register(email: string, password: string, name?: string): Promise<LoginResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.user) {
        throw new Error('Registration failed');
      }

      // Auto-login after signup
      return this.login(email, password);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to authentication server. Please check your internet connection or verify the Supabase URL is correct.');
      }
      throw error;
    }
  },

  async getMe(token: string): Promise<User> {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new Error('Failed to fetch user');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.full_name || 'User',
    };
  },

  async updateProfile(token: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: updates.name,
      },
    });

    if (error || !data.user) {
      throw new Error('Failed to update profile');
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      name: data.user.user_metadata?.full_name || 'User',
    };
  },

  async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },
};

export const createAuthenticatedRequest = (token: string) => {
  return {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};
