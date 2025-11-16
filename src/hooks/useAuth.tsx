// src/auth/useAuth.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabaseClient";
import { syncMessagesFromServer } from "../services/syncMessages";

interface UserProfile {
  user_id: string;
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

  useEffect(() => {
    const loadSession = async () => {
      console.log("[Auth] Restaurando sessão...");
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (sessionUser) {
        console.log("[Auth] Sessão encontrada:", sessionUser);
        setUser(sessionUser);
        await fetchUserProfile(sessionUser.id, sessionUser.email ?? "");
      } else {
        console.log("[Auth] Nenhuma sessão ativa encontrada.");
      }

      setInitialLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user;
      if (authUser) {
        console.log("[Auth] Evento authStateChange - login detectado:", authUser);
        setUser(authUser);
        fetchUserProfile(authUser.id, authUser.email ?? "");
      } else {
        console.log("[Auth] Evento authStateChange - logout detectado");
        setUser(null);
        setUserData(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (id: string, email: string) => {
    console.log(`[Auth] Buscando perfil do usuário: ${id}`);
    const { data, error } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", id)
      .single();

    if (error) {
      console.warn("[Auth] Nenhum perfil encontrado, criando dados mínimos.");
      setUserData({ user_id: id, username: null, email, avatar_url: null });
      return;
    }

    console.log("[Auth] Perfil encontrado:", data);
    setUserData({ user_id: id, username: data.username, email, avatar_url: data.avatar_url });
  };

  async function checkAllowedEmail(email: string) {
    console.log("[Auth] Verificando se email é permitido:", email);
    try {
      const res = await fetch(
        "https://tkbniovizqwiqdapiqbr.supabase.co/functions/v1/pre_signedup_allowed",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();
      console.log("[Auth] Resposta da função pre_signedup_allowed:", data);
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      return data.allowed;
    } catch (err: any) {
      console.error("[Auth] Erro ao verificar email:", err.message);
      return false;
    }
  }

  const login = async (email: string, password: string) => {
    console.log("[Auth] Tentativa de login:", email);
    setAuthLoading(true);

    try {
      const allowed = await checkAllowedEmail(email);
      if (!allowed) throw new Error("Seu email não tem permissão para logar.");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Usuário não retornado.");

      console.log("[Auth] Login bem-sucedido:", data.user);
      setUser(data.user);
      await fetchUserProfile(data.user.id, email);
      await syncMessagesFromServer(data.user.id);
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (email: string, password: string, username: string) => {
    console.log("[Auth] Tentativa de registro:", email);
    setAuthLoading(true);

    try {
      const allowed = await checkAllowedEmail(email);
      if (!allowed) throw new Error("Seu email não tem permissão para registrar.");

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Erro ao registrar usuário.");

      console.log("[Auth] Registro bem-sucedido, criando perfil:", data.user.id);
      await supabase.from("profiles").insert({ id: data.user.id, username, avatar_url: null });

      await fetchUserProfile(data.user.id, email);
      await syncMessagesFromServer(data.user.id);
      setUser(data.user);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    console.log("[Auth] Logout solicitado");
    setAuthLoading(true);

    await supabase.auth.signOut();

    setUser(null);
    setUserData(null);

    console.log("[Auth] Logout concluído");
    setAuthLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, userData, initialLoading, authLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}