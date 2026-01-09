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
  
  // Track previous session to avoid redundant updates that cause re-renders
  const prevSessionRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      // Create a stable session identifier to compare
      const sessionId = newSession?.access_token ?? null;

      // Skip redundant updates - only update if session actually changed
      if (sessionId === prevSessionRef.current) {
        return;
      }
      prevSessionRef.current = sessionId;

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

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

      const sessionId = existingSession?.access_token ?? null;

      // Only update if this is a new session
      if (sessionId !== prevSessionRef.current) {
        prevSessionRef.current = sessionId;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
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
