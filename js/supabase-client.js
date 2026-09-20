/* ===========================================================
   Sforzameanings · Cliente de Supabase
   Conexión a login + base de datos (notas/lecturas)
   =========================================================== */
(function(){
  'use strict';

  // Credenciales públicas de tu proyecto Supabase
  const SUPABASE_URL = 'https://hqpjutupegargsbybljx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_q-ThQsqLJoXcGYGLAmp-0Q_tSNbSuxB';

  // Cargar librería (se carga antes en index.html)
  if(!window.supabase || !window.supabase.createClient){
    console.error('[Sforza] Falta cargar @supabase/supabase-js en index.html');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- API pública ---------- */
  window.SupabaseClient = {

    /* LOGIN / LOGOUT */
    async login(email, password){
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if(error) return { ok:false, error: error.message };
      return { ok:true, user: data.user };
    },

    async logout(){
      await client.auth.signOut();
    },

    async getSession(){
      const { data } = await client.auth.getSession();
      return data.session || null;
    },

    async getUser(){
      const { data } = await client.auth.getUser();
      return data.user || null;
    },

    /* NOTAS / LECTURAS */
    async saveReading(payload){
      const user = await this.getUser();
      if(!user) return { ok:false, error:'Sin sesión' };

      const { data, error } = await client
        .from('notas')
        .insert({
          user_id: user.id,
          deck_id: payload.deck_id,
          cards: payload.cards,
          nota: payload.nota || ''
        })
        .select()
        .single();

      if(error) return { ok:false, error: error.message };
      return { ok:true, data };
    },

    async getReadings(){
      const user = await this.getUser();
      if(!user) return { ok:false, error:'Sin sesión', data:[] };

      const { data, error } = await client
        .from('notas')
        .select('*')
        .order('created_at', { ascending: false });

      if(error) return { ok:false, error: error.message, data:[] };
      return { ok:true, data };
    },

    async updateReading(id, nota){
      const { data, error } = await client
        .from('notas')
        .update({ nota, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if(error) return { ok:false, error: error.message };
      return { ok:true, data };
    },

    async deleteReading(id){
      const { error } = await client.from('notas').delete().eq('id', id);
      if(error) return { ok:false, error: error.message };
      return { ok:true };
    }

  };

  /* ---------- Cambios de sesión ---------- */
  client.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_OUT') {
      window.dispatchEvent(new CustomEvent('sforza:logout'));
    } else if(event === 'SIGNED_IN' && session) {
      window.dispatchEvent(new CustomEvent('sforza:login', { detail: session.user }));
    }
  });

})();