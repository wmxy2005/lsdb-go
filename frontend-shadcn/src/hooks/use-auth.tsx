import { authCurrent, authLogout, authRegister, loginAndStoreToken } from '@/api/auth';
import { setToken } from '@/api/client';
import type { UserInfo } from '@/api/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AuthContextValue = {
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await authCurrent();
    if (res.success && res.data) {
      if (res.data.token) setToken(res.data.token);
      setUser(res.data);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await loginAndStoreToken(username, password);
    if (res.success) {
      await refresh();
      return { success: true };
    }
    return { success: false, message: res.message };
  }, [refresh]);

  const register = useCallback(async (username: string, password: string) => {
    const res = await authRegister(username, password);
    if (res.success) {
      return login(username, password);
    }
    return { success: false, message: res.message };
  }, [login]);

  const logout = useCallback(async () => {
    await authLogout();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: (user?.id ?? 0) > 0,
      login,
      register,
      logout,
      refresh,
    }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
