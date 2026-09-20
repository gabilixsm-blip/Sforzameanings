/* ===========================================================
   Sforzameanings · Autenticación con Supabase
   Overlay SIEMPRE visible al entrar. Solo se oculta con sesión válida.
   =========================================================== */
(function(){
  'use strict';

  const $ = sel => document.querySelector(sel);
  let currentUser = null;
  let initialized = false;

  /* ---------- Overlay ---------- */
  function showLoginOverlay(){
    const ov = $('#loginOverlay');
    if(ov) ov.classList.add('open');
    document.body.classList.add('pre-auth');        // bloquea scroll
  }
  function hideLoginOverlay(){
    const ov = $('#loginOverlay');
    if(ov) ov.classList.remove('open');
    document.body.classList.remove('pre-auth');     // libera scroll
    window.scrollTo(0, 0);
  }

  function showLoginMsg(text, isError){
    const el = $('#loginMsg');
    if(!el) return;
    el.textContent = text || '';
    el.classList.remove('ok','err');
    if(text) el.classList.add(isError ? 'err' : 'ok');
  }

  /* ---------- Header ---------- */
  function paintUserLabel(user){
    const lbl = $('#userLabel');
    if(!lbl) return;
    if(user){
      const name = (user.email || '').split('@')[0] || 'tarotista';
      lbl.textContent = '👤 ' + name;
      lbl.style.display = 'inline-block';
    } else {
      lbl.textContent = '';
      lbl.style.display = 'none';
    }
  }

  /* ---------- Login ---------- */
  async function handleLogin(e){
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    const pass  = $('#loginPassword').value;
    const btn   = $('#loginBtn');

    if(!email || !pass){
      showLoginMsg('Completa email y contraseña.', true);
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Entrando…';
    showLoginMsg('', false);

    const res = await window.SupabaseClient.login(email, pass);

    btn.disabled = false;
    btn.textContent = 'Entrar';

    if(!res.ok){
      showLoginMsg('✕ ' + (res.error || 'Credenciales incorrectas'), true);
      return;
    }

    currentUser = res.user;
    showLoginMsg('✔ Bienvenida', false);
    paintUserLabel(currentUser);

    setTimeout(() => {
      hideLoginOverlay();
      window.dispatchEvent(new CustomEvent('sforza:login', { detail: currentUser }));
    }, 400);
  }

  /* ---------- Logout ---------- */
  async function handleLogout(){
    if(!confirm('¿Cerrar sesión?')) return;
    await window.SupabaseClient.logout();
    currentUser = null;
    paintUserLabel(null);

    const email = $('#loginEmail');
    const pass  = $('#loginPassword');
    if(email) email.value = '';
    if(pass)  pass.value  = '';

    showLoginMsg('', false);
    showLoginOverlay();
    window.dispatchEvent(new CustomEvent('sforza:logout'));
  }

  /* ---------- Init ---------- */
  async function initAuth(){
    if(initialized) return;
    initialized = true;

    // Aseguramos que el body empiece BLOQUEADO hasta saber si hay sesión
    document.body.classList.add('pre-auth');
    showLoginOverlay();

    // Form login
    const form = $('#loginForm');
    if(form) form.addEventListener('submit', handleLogin);

    // Botón logout
    const out = $('#logoutBtn');
    if(out) out.addEventListener('click', handleLogout);

    // Comprobar sesión activa
    const session = await window.SupabaseClient.getSession();

    if(session && session.user){
      currentUser = session.user;
      paintUserLabel(currentUser);
      hideLoginOverlay();
      window.dispatchEvent(new CustomEvent('sforza:login', { detail: currentUser }));
    }
    // Si NO hay sesión: ya dejamos el overlay mostrado arriba

    // Listeners globales por si expira el token
    window.addEventListener('sforza:logout', () => {
      currentUser = null;
      paintUserLabel(null);
      showLoginOverlay();
    });
  }

  document.addEventListener('DOMContentLoaded', initAuth);

  /* ---------- Exponer helpers ---------- */
  window.SforzaAuth = {
    getUser: () => currentUser,
    isLogged: () => !!currentUser,
    logout: handleLogout
  };

})();