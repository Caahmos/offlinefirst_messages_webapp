import { useEffect, useState } from "react";
import { db, type Message } from "./db";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useMessages } from "./hooks/useMessages";
import { useMutation } from "@tanstack/react-query";
import { sendMessageSupabase } from "./services/sendMessages";
import { testConnection } from "./services/testSupabseConection";

function useSendMessage() {
  return useMutation({
    mutationFn: sendMessageSupabase,

    onSuccess: async (serverMsg, originalMsg) => {
      console.log("[onSuccess] Supabase retornou:", serverMsg);

      await db.messages.update(originalMsg.id, {
        pending: 0,
        created_at: serverMsg.created_at ?? originalMsg.created_at,
      });

      console.log("[onSuccess] Mensagem marcada como enviada no Dexie");
    },

    onError: (err, originalMsg) => {
      console.error("[useSendMessage] ERRO enviando mensagem:", err);
      console.log("[useSendMessage] Ela continua pendente:", originalMsg.id);
    },
  });
}

export default function MessageUI() {
  const messages = useMessages();
  const sendMessage = useSendMessage();
  const online = useOnlineStatus();
  const [text, setText] = useState("");

  useEffect(() => {
    testConnection();
  }, []);

  useEffect(() => {
    if (!online) {
      console.log("[Reconect] Ainda offline, nada a enviar");
      return;
    }

    console.log("[Reconect] Voltou online! Enviando pendentes...");

    (async () => {
      const pendentes = await db.messages.where("pending").equals(1).toArray();

      console.log(`[Reconect] Encontradas ${pendentes.length} pendentes`);

      for (const msg of pendentes) {
        try {
          console.log("[Reconect] Enviando pendente:", msg.id);
          await sendMessage.mutateAsync(msg);
        } catch (err) {
          console.error("[Reconect] Falhou ao enviar pendente:", msg.id, err);
        }
      }
    })();
  }, [online]);

  const handleSend = async () => {
    if (!text.trim()) return;

    const now = new Date().toISOString();

    const msg: Message = {
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      content: text,
      client_created_at: now,
      created_at: now,
      pending: online ? 0 : 1,
    };

    console.log("[handleSend] Salvando local:", msg);
    await db.messages.add(msg);
    setText("");

    if (online) {
      console.log("[handleSend] Online → enviando ao Supabase:", msg.id);
      try {
        await sendMessage.mutateAsync(msg);
      } catch (err) {
        console.error("[handleSend] Erro ao enviar enquanto online:", err);
      }
    } else {
      console.log("[handleSend] Offline → ficará pendente:", msg.id);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h2>Mensagens (Offline First)</h2>

      <p>Status:
        <strong style={{ color: online ? "green" : "red" }}>
          {online ? " Online" : " Offline"}
        </strong>
      </p>

      <div style={{
        height: 250,
        overflowY: "auto",
        padding: 10,
        border: "1px solid #ccc"
      }}>
        {messages.map((m) => (
          <div key={m.id} style={{
            marginBottom: 8,
            padding: 8,
            borderLeft: m.pending === 1
              ? "4px solid orange"
              : "4px solid green",
          }}>
            {m.content}

            {m.pending === 1 && (
              <small style={{ color: "orange" }}>
                ⏳ Enviando quando online...
              </small>
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