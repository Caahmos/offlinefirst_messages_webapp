import { supabase } from "../supabaseClient";

export async function sendMessageSupabase(msg: any) {
  console.log("📤 Enviando mensagem para Supabase:", msg);

  // Tirar apenas campos que nunca devem ir para Supabase
  const { id, pending, ...clean } = msg;

  const payload = {
    ...clean,
    offline_id: id, // <-- SEMPRE manda o ID local como offline_id
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