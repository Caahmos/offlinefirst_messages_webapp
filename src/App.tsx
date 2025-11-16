import { useEffect, useState } from "react";
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
      await db.messages.update(originalMsg.id, {
        pending: 0,
        created_at: serverMsg.created_at ?? originalMsg.created_at,
      });
    },
    onError: (err, originalMsg) => {
      console.error("[useSendMessage] ERRO enviando:", err, originalMsg.id);
    },
  });
}

export default function MessageUI() {
  const messages = useMessages();
  const sendMessage = useSendMessage();
  const online = useOnlineStatus();
  const [text, setText] = useState("");
  const { logout, userData } = useAuth();

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

  // 🔹 Realtime listener
  useEffect(() => {
    // função async interna
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

  useEffect(() => {
    if (!userData) return;

    // Cria o canal
    const channel = supabase
      .channel("public:messages") // nome do canal, pode ser qualquer string
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const newMsg = payload.new as Message;

          console.log("[Realtime] Nova mensagem recebida:", newMsg);

          // Salva no Dexie se ainda não existe
          const exists = await db.messages.get(newMsg.id);
          if (!exists) {
            await db.messages.add({ ...newMsg, pending: 0 });
          }
        }
      )
      .subscribe();

    // Cleanup
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
    const msg: Message = {
      id: crypto.randomUUID(),
      user_id: userData?.user_id as string,
      content: text,
      client_created_at: now,
      created_at: now,
      pending: online ? 0 : 1,
    };

    await db.messages.add(msg);
    setText("");

    if (online) {
      try { await sendMessage.mutateAsync(msg); }
      catch (err) { console.error("[handleSend] Erro ao enviar:", err); }
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

      <div style={{ height: 250, overflowY: "auto", padding: 10, border: "1px solid #ccc" }}>
        {messages.map((m) => (
          <div key={m.id} style={{
            marginBottom: 8,
            padding: 8,
            borderLeft: m.pending === 1 ? "4px solid orange" : "4px solid green",
          }}>
            {m.content}
            {m.pending === 1 && <small style={{ color: "orange" }}>⏳ Enviando quando online...</small>}
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
