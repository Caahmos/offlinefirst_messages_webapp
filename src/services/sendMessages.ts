import { supabase } from "../supabaseClient";

export async function sendMessageSupabase(msg: any) {
  console.log("📤 Enviando mensagem para Supabase:", msg);

  // Remover campos que não devem ser enviados
  const { id, pending, created_at, ...clean } = msg;

  const payload = {
    ...clean,
    delivered: true,
  };

  console.log("📦 Payload enviado:", payload);

  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*");

  if (error) {
    console.error("❌ ERRO NO INSERT DO SUPABASE:", error);
    throw error;
  }

  console.log("✅ Mensagem inserida no Supabase:", data[0]);

  return data[0];
}
