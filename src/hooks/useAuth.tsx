import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; shotgridError?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  
  // Track previous auth identity to avoid redundant updates that cause re-renders (e.g. TOKEN_REFRESHED)
  const prevAuthKeyRef = useRef<string | null>(null);

  // Track if initial auth check is complete to prevent flickering
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      // Only treat auth as "changed" when the user identity changes (not when tokens refresh)
      const authKey = newSession?.user?.id ?? null;

      if (authKey === prevAuthKeyRef.current && initializedRef.current) {
        return;
      }

      prevAuthKeyRef.current = authKey;

      // Use a microtask to batch state updates and prevent input focus loss
      queueMicrotask(() => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
        initializedRef.current = true;
      });

      // Detect password recovery event (some flows come through as SIGNED_IN with type=recovery in the URL hash)
      const hash = window.location.hash ?? '';
      const isRecoveryHash = /(^|[&#])type=recovery(&|$)/.test(hash);
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && isRecoveryHash)) {
        setIsPasswordRecovery(true);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;

      const authKey = existingSession?.user?.id ?? null;

      // Only update if this is a new auth identity or not yet initialized
      if (authKey !== prevAuthKeyRef.current || !initializedRef.current) {
        prevAuthKeyRef.current = authKey;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        initializedRef.current = true;
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Verify email is from refugevfx.com domain
      const emailDomain = email.split('@')[1]?.toLowerCase();
      if (emailDomain !== 'refugevfx.com') {
        return { error: null, shotgridError: 'Only @refugevfx.com email addresses are allowed to sign up.' };
      }

      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        }
      });

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isPasswordRecovery, signUp, signIn, signOut, resetPassword, updatePassword, clearPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
