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
    // 1⃣ Procurar registro local onde id === offline_id (versão offline)
    const offlineVersion = await db.messages.get(msg.offline_id);

    if (offlineVersion) {
      console.log(
        `[syncMessages] Encontrado registro offline (${offlineVersion.id}) → substituindo pelo registro real (${msg.id})`
      );

      // Remover a versão offline
      await db.messages.delete(msg.offline_id);
    }

    // 2⃣ Remover duplicatas: registros que tenham offline_id diferente do id
    const duplicates = await db.messages
      .where("offline_id")
      .equals(msg.offline_id)
      .and((m) => m.id !== msg.id)
      .toArray();

    for (const dup of duplicates) {
      console.log(
        `[syncMessages] Removendo duplicata local (id=${dup.id}, offline_id=${dup.offline_id})`
      );
      await db.messages.delete(dup.id);
    }

    // 3⃣ Verificar se já existe registro com o id final
    const exists = await db.messages.get(msg.id);
    if (!exists) {
      console.log(`[syncMessages] Inserindo mensagem ${msg.id}`);

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
  }

  console.log("[syncMessages] Sincronização concluída!");
}