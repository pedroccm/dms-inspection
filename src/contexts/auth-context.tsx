"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      setProfile(data as Profile | null);
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
    setUser(null);
    setProfile(null);
    window.location.href = "/login";
  }, [supabase]);

  const role = profile?.role ?? null;
  const isAdmin = role === "admin";

  return (
    <AuthContext.Provider
      value={{ user, profile, role, isAdmin, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
