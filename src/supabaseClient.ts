import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,          // mantém o usuário logado
    autoRefreshToken: true,        // renova tokens automaticamente
    detectSessionInUrl: true,      // para login via magic links
  },
  global: {
    fetch: (...args) => fetch(...args),  // necessário para frameworks
  },
  realtime: {
    params: {
      eventsPerSecond: 5,          // opcional, evita spam
    },
  },
})
