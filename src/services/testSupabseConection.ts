import { supabase } from "../supabaseClient";

// 🔥 Teste básico de conexão: pedir 1 linha da tabela messages
export async function testConnection() {
  console.log("Testando conexão com Supabase...");

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .limit(1);

  if (error) {
    console.error("❌ ERRO Supabase:", error);
  } else {
    console.log("✅ Supabase conectado!");
    console.log("Primeira linha retornada:", data);
  }
}
