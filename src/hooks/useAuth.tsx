import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; isAdmin: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const authCheckId = useRef(0);

  const resolveSession = useCallback(async (nextSession: Session | null) => {
    const checkId = authCheckId.current + 1;
    authCheckId.current = checkId;

    setSession(nextSession);
    setUser(nextSession?.user ?? null);

    if (!nextSession?.user) {
      setIsAdmin(false);
      setIsLoading(false);
      return false;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", nextSession.user.id)
      .eq("role", "admin")
      .maybeSingle();

    const admin = !error && data?.role === "admin";
    if (authCheckId.current === checkId) {
      setIsAdmin(admin);
      setIsLoading(false);
    }

    return admin;
  }, []);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setTimeout(() => {
          void resolveSession(session);
        }, 0);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      void resolveSession(session);
    });

    return () => subscription.unsubscribe();
  }, [resolveSession]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      await resolveSession(null);
      return { error: error as Error, isAdmin: false };
    }

    const admin = await resolveSession(data.session ?? null);
    return { error: null, isAdmin: admin };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    authCheckId.current += 1;
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
