import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export default function Login() {
  const { login, authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Erro ao tentar fazer login.");
    }
  };

  return (
    <div
      style={{
        maxWidth: 380,
        margin: "60px auto",
        padding: 24,
        borderRadius: 12,
        border: "1px solid #ddd",
        background: "#fff",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>Entrar</h2>

      <form onSubmit={handleLogin}>
        <label style={{ display: "block", marginBottom: 8 }}>E-mail:</label>

        <input
          type="email"
          placeholder="seuemail@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 16,
          }}
        />

        <label style={{ display: "block", marginBottom: 8 }}>Senha:</label>

        <input
          type="password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 20,
          }}
        />

        {/* 🔥 Mostra erro */}
        {error && (
          <div
            style={{
              background: "#ffe6e6",
              padding: 10,
              borderRadius: 8,
              color: "#b30000",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={authLoading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            background: authLoading ? "#7d8bff" : "#4a67ff",
            color: "#fff",
            border: "none",
            cursor: authLoading ? "not-allowed" : "pointer",
            fontSize: 16,
            fontWeight: "bold",
            transition: "0.2s",
          }}
        >
          {authLoading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
