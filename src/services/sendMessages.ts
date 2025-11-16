import { supabase } from "../supabaseClient";

export async function sendMessageSupabase(msg: any) {
  console.log("📤 Enviando mensagem para Supabase:", msg);

  // Remover apenas campos que Supabase não precisa
  const { pending, ...clean } = msg; // manter id e created_at

  const payload = {
    ...clean,
    delivered: true,
  };

  console.log("📦 Payload enviado:", payload);

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single(); // pega só 1 registro

  if (error) {
    console.error("❌ ERRO NO INSERT DO SUPABASE:", error);
    throw error;
  }

  console.log("✅ Mensagem inserida no Supabase:", data);

  return data;
}