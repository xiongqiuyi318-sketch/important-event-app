import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AccessMode, AuthResult, AuthUser } from '../types/storage';

const ACCESS_MODE_KEY = 'app_access_mode';

interface AccessContextValue {
  mode: AccessMode;
  canEdit: boolean;
  user: AuthUser | null;
  loading: boolean;
  continueAsGuest: () => void;
  signInEditor: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<AccessMode>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedMode = sessionStorage.getItem(ACCESS_MODE_KEY) as AccessMode;
    if (savedMode === 'guest') {
      setMode('guest');
      setLoading(false);
      return;
    }

    if (!supabase) {
      setMode(null);
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setMode('editor');
        setUser({ id: data.user.id, email: data.user.email || '' });
      } else {
        setMode(null);
      }
      setLoading(false);
    });
  }, []);

  const continueAsGuest = () => {
    sessionStorage.setItem(ACCESS_MODE_KEY, 'guest');
    setMode('guest');
    setUser(null);
  };

  const signInEditor = async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) {
      return { user: null, error: '未配置 Supabase 环境变量，请先配置后再登录编辑者模式。' };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return { user: null, error: error?.message || '登录失败' };
    }

    const authUser = { id: data.user.id, email: data.user.email || email };
    sessionStorage.setItem(ACCESS_MODE_KEY, 'editor');
    setMode('editor');
    setUser(authUser);
    return { user: authUser, error: null };
  };

  const signOut = async () => {
    sessionStorage.removeItem(ACCESS_MODE_KEY);
    setMode(null);
    setUser(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const value = useMemo(
    () => ({
      mode,
      canEdit: mode === 'editor',
      user,
      loading,
      continueAsGuest,
      signInEditor,
      signOut,
    }),
    [loading, mode, user]
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error('useAccess must be used within AccessProvider');
  }
  return ctx;
}
