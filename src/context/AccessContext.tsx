import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AccessMode, AuthResult, AuthUser } from '../types/storage';

const ACCESS_MODE_KEY = 'app_access_mode';
const GUEST_MODE_VALUE = 'guest' as const;

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
    if (!supabase) {
      const savedMode = localStorage.getItem(ACCESS_MODE_KEY) as AccessMode;
      if (savedMode === GUEST_MODE_VALUE) {
        setMode(GUEST_MODE_VALUE);
      } else {
        setMode(null);
      }
      setLoading(false);
      return;
    }
    const authClient = supabase.auth;

    let isMounted = true;

    const syncFromSession = async () => {
      const { data, error } = await authClient.getSession();
      if (!isMounted) {
        return;
      }

      const sessionUser = error ? null : data.session?.user ?? null;
      if (sessionUser) {
        localStorage.removeItem(ACCESS_MODE_KEY);
        setMode('editor');
        setUser({ id: sessionUser.id, email: sessionUser.email || '' });
      } else {
        const savedMode = localStorage.getItem(ACCESS_MODE_KEY) as AccessMode;
        setMode(savedMode === GUEST_MODE_VALUE ? GUEST_MODE_VALUE : null);
        setUser(null);
      }
      setLoading(false);
    };

    const { data: authListener } = authClient.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          localStorage.removeItem(ACCESS_MODE_KEY);
          setMode('editor');
          setUser({ id: session.user.id, email: session.user.email || '' });
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        const savedMode = localStorage.getItem(ACCESS_MODE_KEY) as AccessMode;
        setMode(savedMode === GUEST_MODE_VALUE ? GUEST_MODE_VALUE : null);
        setUser(null);
      }
    });

    syncFromSession();

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const continueAsGuest = () => {
    localStorage.setItem(ACCESS_MODE_KEY, GUEST_MODE_VALUE);
    setMode(GUEST_MODE_VALUE);
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

    let sessionUser: typeof data.user | null = data.session?.user ?? null;
    if (!sessionUser) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        return { user: null, error: sessionError.message || '登录成功但会话校验失败，请重试。' };
      }
      sessionUser = sessionData.session?.user ?? null;
    }

    if (!sessionUser) {
      return { user: null, error: '登录成功但会话未建立，请刷新后重试。' };
    }
    const confirmedUser = sessionUser;

    const authUser = { id: confirmedUser.id, email: confirmedUser.email || email };
    localStorage.removeItem(ACCESS_MODE_KEY);
    setMode('editor');
    setUser(authUser);
    return { user: authUser, error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(ACCESS_MODE_KEY);
    setMode(null);
    setUser(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  const value = useMemo(
    () => {
      const effectiveMode: AccessMode = user ? 'editor' : mode;
      return {
        mode: effectiveMode,
        canEdit: Boolean(user),
        user,
        loading,
        continueAsGuest,
        signInEditor,
        signOut,
      };
    },
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
