import { supabase } from "../supabaseClient";

export async function sendMessageSupabase(msg: any) {
  console.log("📤 Enviando mensagem para Supabase:", msg);

  // ❗ Remover campos que não devem ir
  const { id, pending, ...clean } = msg;

  // ❗ Garantir que offline_id SEMPRE vai pro Supabase
  // É a única forma de identificar a mensagem e evitar duplicação
  const payload = {
    ...clean,
    offline_id: msg.offline_id,
    delivered: true,
  };

  console.log("📦 Payload enviado:", payload);

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    console.error("❌ ERRO NO INSERT DO SUPABASE:", error);
    throw error;
  }

  console.log("✅ Mensagem criada no Supabase:", data);

  return data;
}