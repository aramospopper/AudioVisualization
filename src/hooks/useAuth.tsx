import { useCallback } from 'react';
import useLocalStorage from './useLocalStorage';

export interface User {
  email: string;
  name: string;
  phone?: string;
  bio?: string;
  username?: string;
}

interface StoredCredentials {
  [email: string]: string; // email -> password
}

export function useAuth() {
  const [user, setUser] = useLocalStorage<User | null>('auth.user', null);
  const [credentials, setCredentials] = useLocalStorage<StoredCredentials>('auth.credentials', {});

  const register = useCallback((email: string, password: string, name?: string) => {
    // Validate inputs
    if (!email || !password || password.length < 4) {
      return { success: false, error: 'Email and password (min 4 chars) required' };
    }

    // Check if user already exists
    if (credentials[email]) {
      return { success: false, error: 'Account with this email already exists' };
    }

    // Store credentials
    setCredentials({ ...credentials, [email]: password });
    
    // Auto-login after signup
    const userName = name || email.split('@')[0] || 'User';
    setUser({ email, name: userName });
    
    return { success: true };
  }, [credentials, setCredentials, setUser]);

  const login = useCallback((email: string, password: string) => {
    // Demo account - allows any email with password length >= 4
    // OR check if credentials match for registered users
    if (password.length >= 4) {
      if (credentials[email]) {
        // Registered user - check password match
        if (credentials[email] === password) {
          const name = email.split('@')[0] || 'User';
          setUser({ email, name });
          return true;
        }
        return false; // Wrong password
      } else {
        // No registered account - allow demo login
        const name = email.split('@')[0] || 'User';
        setUser({ email, name });
        return true;
      }
    }
    return false;
  }, [credentials, setUser]);

  const logout = useCallback(() => {
    setUser(null);
  }, [setUser]);

  const updateUserProfile = useCallback((updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      return true;
    }
    return false;
  }, [user, setUser]);

  return {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUserProfile,
  };
}
