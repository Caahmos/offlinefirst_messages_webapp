// src/hooks/useAuth.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabaseClient";
import { syncMessagesFromServer } from "../services/syncMessages";

export interface UserProfile {
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

  // 🔹 Restaurar sessão offline ou online
  useEffect(() => {
    const loadSession = async () => {
      console.log("[Auth] Restaurando sessão...");

      // 1️⃣ Tenta restaurar do localStorage (offline)
      const stored = localStorage.getItem("offlineUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("[Auth] Sessão offline encontrada:", parsed.user);
        setUser(parsed.user);
        setUserData(parsed.userData);
        setInitialLoading(false);
        return;
      }

      // 2️⃣ Fallback online (Supabase)
      try {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user;

        if (sessionUser) {
          console.log("[Auth] Sessão online encontrada:", sessionUser);
          setUser(sessionUser);
          await fetchUserProfile(sessionUser.id, sessionUser.email ?? "");
        }
      } catch (err) {
        console.warn("[Auth] Não foi possível restaurar sessão online:", err);
      }

      setInitialLoading(false);
    };

    loadSession();

    // 🔹 Listener de authStateChange para atualizar sessão
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
        localStorage.removeItem("offlineUser");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔹 Busca perfil do usuário no Supabase
  const fetchUserProfile = async (id: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", id)
        .single();

      if (error || !data) {
        console.warn("[Auth] Nenhum perfil encontrado, criando dados mínimos.");
        const minimalProfile: UserProfile = { user_id: id, username: null, email, avatar_url: null };
        setUserData(minimalProfile);
        localStorage.setItem("offlineUser", JSON.stringify({ user, userData: minimalProfile }));
        return minimalProfile;
      }

      const profile: UserProfile = {
        user_id: id,
        username: data.username,
        email,
        avatar_url: data.avatar_url,
      };
      setUserData(profile);

      // Salva offline
      localStorage.setItem("offlineUser", JSON.stringify({ user, userData: profile }));

      return profile;
    } catch (err) {
      console.error("[Auth] Erro ao buscar perfil:", err);
      return null;
    }
  };

  // 🔹 Verifica se email é permitido (ex: whitelist)
  async function checkAllowedEmail(email: string) {
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
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");
      return data.allowed;
    } catch (err: any) {
      console.error("[Auth] Erro ao verificar email:", err.message);
      return false;
    }
  }

  // 🔹 Login
  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    try {
      const allowed = await checkAllowedEmail(email);
      if (!allowed) throw new Error("Seu email não tem permissão para logar.");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Usuário não retornado.");

      setUser(data.user);
      const profile = await fetchUserProfile(data.user.id, email);

      // Sincroniza mensagens do servidor
      await syncMessagesFromServer(data.user.id);

      // Salva offline
      localStorage.setItem("offlineUser", JSON.stringify({ user: data.user, userData: profile }));
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔹 Registro
  const register = async (email: string, password: string, username: string) => {
    setAuthLoading(true);
    try {
      const allowed = await checkAllowedEmail(email);
      if (!allowed) throw new Error("Seu email não tem permissão para registrar.");

      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Erro ao registrar usuário.");

      // Cria perfil
      await supabase.from("profiles").insert({ id: data.user.id, username, avatar_url: null });

      setUser(data.user);
      const profile: UserProfile = { user_id: data.user.id, username, email, avatar_url: null };
      setUserData(profile);

      // Sincroniza mensagens
      await syncMessagesFromServer(data.user.id);

      // Salva offline
      localStorage.setItem("offlineUser", JSON.stringify({ user: data.user, userData: profile }));
    } finally {
      setAuthLoading(false);
    }
  };

  // 🔹 Logout
  const logout = async () => {
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserData(null);
      localStorage.removeItem("offlineUser");
    } finally {
      setAuthLoading(false);
    }
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