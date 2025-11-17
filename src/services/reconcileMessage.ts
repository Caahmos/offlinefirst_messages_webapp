import { db, type Message } from "../db";

/**
 * Reconciliar mensagem recebida do servidor:
 * - se existir uma versão local com id === offline_id → substitui
 * - remove duplicatas
 * - insere mensagem nova se necessário
 */
export async function reconcileServerMessage(serverMsg: Message) {
  // 1⃣ Verificar se existe uma versão offline (id === offline_id)
  const offlineVersion = await db.messages.get(serverMsg.offline_id);

  if (offlineVersion) {
    console.log("[reconcile] Substituindo offline pela versão final:", {
      offline: offlineVersion.id,
      real: serverMsg.id,
    });

    await db.messages.delete(offlineVersion.id);

    await db.messages.add({
      ...serverMsg,
      pending: 0,
    });

    return;
  }

  // 2⃣ Remover duplicatas: mensagens locais com o mesmo offline_id mas id diferente
  const duplicates = await db.messages
    .where("offline_id")
    .equals(serverMsg.offline_id)
    .and((m) => m.id !== serverMsg.id)
    .toArray();

  for (const dup of duplicates) {
    console.log("[reconcile] Removendo duplicata local:", dup.id);
    await db.messages.delete(dup.id);
  }

  // 3⃣ Se não existir a mensagem pelo ID final, insere
  const existsByServerId = await db.messages.get(serverMsg.id);
  if (!existsByServerId) {
    console.log("[reconcile] Inserindo nova mensagem:", serverMsg.id);

    await db.messages.add({
      ...serverMsg,
      pending: 0,
    });
  }
}
