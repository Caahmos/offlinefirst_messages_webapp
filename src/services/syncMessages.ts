// src/services/syncMessages.ts
import { supabase } from "../supabaseClient";
import { db } from "../db";

export async function syncMessagesFromServer(user_id: string) {
  console.log("[syncMessages] Iniciando sincronização do Supabase...");

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", user_id)
    .order("client_created_at", { ascending: true });

  if (error) {
    console.error("[syncMessages] Erro ao buscar mensagens:", error);
    return;
  }

  console.log(`[syncMessages] ${data.length} mensagens encontradas`);

  for (const msg of data) {
    const exists = await db.messages.get(msg.id);
    if (exists) {
      // Já existe → NÃO insere novamente
      continue;
    }

    await db.messages.add({
      id: msg.id,
      user_id: msg.user_id,
      content: msg.content,
      client_created_at: msg.client_created_at,
      created_at: msg.created_at,
      offline_id: msg.offline_id,
      pending: 0,
    });
  }

  console.log("[syncMessages] Sincronização concluída!");
}
