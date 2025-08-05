import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loginError, setLoginError] = useState<Error | null>(null);

  // 초기 사용자 정보 확인
  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
        });
        
        if (mounted) {
          if (response.status === 401 || !response.ok) {
            setUser(null);
          } else {
            const userData = await response.json();
            setUser(userData);
          }
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: { username: string; password: string }) => {
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      const response = await apiRequest('POST', '/api/login', credentials);
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      setLoginError(error as Error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    setIsLoggingOut(true);
    
    try {
      await apiRequest('POST', '/api/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    isLoggingIn,
    isLoggingOut,
    loginError,
  };
}
