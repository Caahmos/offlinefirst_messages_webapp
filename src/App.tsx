import { useEffect, useRef, useState } from "react";
import { db, type Message } from "./db";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useMessages } from "./hooks/useMessages";
import { useMutation } from "@tanstack/react-query";
import { sendMessageSupabase } from "./services/sendMessages";
import { testConnection } from "./services/testSupabseConection";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./supabaseClient";

function useSendMessage() {
  return useMutation({
    mutationFn: sendMessageSupabase,
    onSuccess: async (serverMsg, originalMsg) => {
      // Sucesso → marca como enviado
      await db.messages.update(originalMsg.id, {
        pending: 0,
        created_at: serverMsg.created_at ?? originalMsg.created_at,
      });
    },
    onError: async (err, originalMsg) => {
      if (!navigator.onLine) {
        // Offline → mantém pendente
        await db.messages.update(originalMsg.id, { pending: 1 });
      } else {
        // Online mas erro → não marca como pendente, vamos esperar Realtime atualizar
        console.error(
          "[useSendMessage] Erro enviando online, esperando Realtime:",
          originalMsg.id,
          err
        );
      }
    },
  });
}

export default function MessageUI() {
  const messages = useMessages();
  const sendMessage = useSendMessage();
  const online = useOnlineStatus();
  const [text, setText] = useState("");
  const { logout, userData } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sempre rola para o final quando messages mudam
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth", // ⚡ aqui está o scroll suave
      });
    }
  }, [messages]);

  // 🔹 Testa conexão
  useEffect(() => { testConnection(); }, []);

  // 🔹 Fetch inicial das mensagens do Supabase
  useEffect(() => {
    if (!userData) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;

        for (const msg of data) {
          const exists = await db.messages.get(msg.id);
          if (!exists) await db.messages.add({ ...msg, pending: 0 });
        }
      } catch (err) {
        console.error("[fetchMessages] Erro:", err);
      }
    };

    fetchMessages();
  }, [userData]);


  // função async interna
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erro ao pegar sessão:", error);
        return;
      }

      const session = data.session;
      console.log("JWT:", session?.access_token);
      console.log("user UID:", session?.user?.id);
    };

    fetchData(); // chama a função async
  }, []);

  // 🔹 Realtime listener
  useEffect(() => {
    if (!userData) return;

    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as Message;

          console.log("[Realtime] Nova mensagem recebida:", newMsg);

          // 1. Tenta achar no DB local pelo server ID
          const existsByServerId = await db.messages.get(newMsg.id);

          // 2. Tenta achar mensagem local pelo offline_id
          const existsByOfflineId = await db.messages
            .where("id")
            .equals(newMsg.offline_id)
            .first();

          if (existsByOfflineId) {
            // 🔄 RECONCILIA: substitui a versão offline pela versão do servidor
            await db.messages.delete(existsByOfflineId.id);

            await db.messages.add({
              ...newMsg,
              pending: 0,
            });

            return;
          }

          if (!existsByServerId) {
            // Mensagem nova de outro usuário
            await db.messages.add({ ...newMsg, pending: 0 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userData]);

  // 🔹 Envio pendente offline → online
  useEffect(() => {
    if (!online) return;

    (async () => {
      const pendentes = await db.messages.where("pending").equals(1).toArray();
      for (const msg of pendentes) {
        try { await sendMessage.mutateAsync(msg); }
        catch (err) { console.error("[Reconect] Falha pendente:", msg.id, err); }
      }
    })();
  }, [online]);

  const handleSend = async () => {
    if (!text.trim()) return;

    const now = new Date().toISOString();
    const newID = crypto.randomUUID()
    const msg: Message = {
      id: newID,
      user_id: userData?.user_id as string,
      content: text,
      client_created_at: now,
      offline_id: newID,
      created_at: now,
      pending: online ? 0 : 1, // já offline → pendente
    };

    // salva localmente imediatamente
    await db.messages.add(msg);
    setText("");

    if (online) {
      try {
        await sendMessage.mutateAsync(msg);
      } catch (err) {
        console.error("[handleSend] Falha ao enviar, mensagem marcada como pendente", msg.id);
        // a onError do useMutation já marcou pending = 1
      }
    }
  };

  const handleLogout = async () => { await logout(); };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Mensagens (Offline First)</h2>
        {userData && (
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: "#ff4d4d",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
      </div>

      <p>Status:
        <strong style={{ color: online ? "green" : "red" }}>
          {online ? " Online" : " Offline"}
        </strong>
      </p>

      <div
        ref={containerRef}
        style={{
          height: 250,
          overflowY: "auto",
          padding: 10,
          border: "1px solid #ccc",
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              marginBottom: 8,
              padding: 8,
              borderLeft:
                m.pending === 1 ? "4px solid orange" : "4px solid green",
            }}
          >
            {m.content}
            {m.pending === 1 && (
              <small style={{ color: "orange" }}>⏳ Enviando quando online...</small>
            )}
          </div>
        ))}
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Digite sua mensagem"
        style={{ width: "100%", marginBlock: 10 }}
      />

      <button
        onClick={handleSend}
        disabled={!text}
        style={{ width: "100%", padding: 10 }}
      >
        Enviar
      </button>
    </div>
  );
};
