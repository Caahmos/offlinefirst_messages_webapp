// src/auth/useAuth.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabaseClient";

interface UserProfile {
  username: string | null;
  email: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: any;
  userData: UserProfile | null;
  initialLoading: boolean;
  authLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // -------------------------------------------------------
  // 🔥 RESTAURA SESSÃO AO CARREGAR APP
  // -------------------------------------------------------
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (sessionUser) {
        setUser(sessionUser);
        await fetchUserProfile(
          sessionUser.id,
          sessionUser.email ?? ""
        );
      }

      setInitialLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const authUser = session?.user;

        if (authUser) {
          setUser(authUser);
          fetchUserProfile(authUser.id, authUser.email ?? "");
        } else {
          setUser(null);
          setUserData(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // -------------------------------------------------------
  // 🔥 BUSCA PERFIL DO USUÁRIO
  // -------------------------------------------------------
  const fetchUserProfile = async (id: string, email: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("⚠️ Nenhum perfil encontrado, criando dados mínimos.");
      setUserData({ username: null, email, avatar_url: null });
      return;
    }

    setUserData({
      username: data.username,
      email,
      avatar_url: data.avatar_url,
    });
  };

  // -------------------------------------------------------
  // 🔐 LOGIN
  // -------------------------------------------------------
  const login = async (email: string, password: string) => {
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Usuário não retornado.");

      setUser(data.user);
      await fetchUserProfile(data.user.id, email);
    } finally {
      setAuthLoading(false);
    }
  };

  // -------------------------------------------------------
  // 📝 REGISTRO
  // -------------------------------------------------------
  const register = async (email: string, password: string, username: string) => {
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error("Erro ao registrar usuário.");

      // Cria perfil compatível com sua tabela
      await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        avatar_url: null,
      });

      await fetchUserProfile(data.user.id, email);
      setUser(data.user);
    } finally {
      setAuthLoading(false);
    }
  };

  // -------------------------------------------------------
  // 🚪 LOGOUT
  // -------------------------------------------------------
  const logout = async () => {
    setAuthLoading(true);

    await supabase.auth.signOut();

    setUser(null);
    setUserData(null);

    setAuthLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        initialLoading,
        authLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}