import { useCallback, useState, useEffect } from 'react';
import { apiService, User, supabase } from '../../../services/api';

const TOKEN_KEY = 'auth.token';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth on mount - validate existing token and listen to Supabase session changes
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if there's an existing session in Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Restore user from existing session
          localStorage.setItem(TOKEN_KEY, session.access_token);
          const user = await apiService.getMe(session.access_token);
          setUser(user);
        } else {
          // Fall back to localStorage token if no session
          const token = localStorage.getItem(TOKEN_KEY);
          if (token) {
            try {
              const user = await apiService.getMe(token);
              setUser(user);
            } catch (error) {
              // Token invalid or expired
              localStorage.removeItem(TOKEN_KEY);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Listen to auth state changes from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          localStorage.setItem(TOKEN_KEY, session.access_token);
          try {
            const user = await apiService.getMe(session.access_token);
            setUser(user);
          } catch (error) {
            console.error('Error fetching user:', error);
            setUser(null);
          }
        } else {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const response = await apiService.register(email, password, name);
      localStorage.setItem(TOKEN_KEY, response.token);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiService.login(email, password);
      localStorage.setItem(TOKEN_KEY, response.token);
      setUser(response.user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if logout fails
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<boolean> => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !user) {
      return false;
    }

    try {
      const updatedUser = await apiService.updateProfile(token, updates);
      setUser(updatedUser);
      return true;
    } catch (error) {
      console.error('Profile update error:', error);
      return false;
    }
  }, [user]);

  const getAuthToken = useCallback(() => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    isInitialized,
    login,
    register,
    logout,
    updateUserProfile,
    getAuthToken,
  };
}

export type { User };
