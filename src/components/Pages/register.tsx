// src/components/Pages/Register.tsx
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword || !username) {
      alert("Preencha todos os campos!");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, username);
      alert("✅ Registro realizado com sucesso!");
    } catch (err: any) {
      console.error("Erro no registro:", err);
      alert("❌ Erro no registro: " + (err.message || err));
    } finally {
      setLoading(false);
      navigate('/')
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
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>Registrar</h2>

      <form onSubmit={handleRegister}>
        <label style={{ display: "block", marginBottom: 8 }}>Usuário:</label>
        <input
          type="text"
          placeholder="Seu nome"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 16,
          }}
        />

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
            marginBottom: 16,
          }}
        />

        <label style={{ display: "block", marginBottom: 8 }}>Confirmar Senha:</label>
        <input
          type="password"
          placeholder="Confirme sua senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            marginBottom: 20,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            background: "#4a67ff",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          {loading ? "Registrando..." : "Registrar"}
        </button>
        <Link style={{ paddingTop: 50 }} to="/">Clque aqui para fazer login</Link>
      </form>
    </div>
  );
}
