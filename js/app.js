/* ===========================================================
   Sforzameanings · Motor de la aplicación
   Consulta de cartas + guardar lecturas (con o sin nota) + historial
   =========================================================== */
(function(){
  'use strict';

  const DECKS = {};
  if(window.DECK_ESPANOLA) DECKS.espanola = window.DECK_ESPANOLA;
  if(window.DECK_RIDER)    DECKS.rider    = window.DECK_RIDER;
  if(window.DECK_MARSELLA) DECKS.marsella = window.DECK_MARSELLA;

  const state = {
    deckId: 'espanola',
    selection: [],
    user: null
  };

  const $ = sel => document.querySelector(sel);

  /* ---------- Utilidades ---------- */
  const deck = () => DECKS[state.deckId];
  const findCard = (deckId, cardId) => {
    const d = DECKS[deckId]; if(!d) return null;
    return d.cards.find(c => c.id === cardId);
  };
  const symbolFor = card => {
    if(!card) return '✦';
    const d = deck();
    const s = d.suits[card.s || card.type || 'mayor'];
    return s ? s.symbol : '✦';
  };
  const suitNameFor = card => {
    const d = deck();
    const s = d.suits[card.s || card.type || 'mayor'];
    return s ? s.name : '';
  };
  const escapeHtml = str => String(str || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  const fmtDate = iso => {
    if(!iso) return '';
    try {
      return new Date(iso).toLocaleString('es-MX', {
        day:'2-digit', month:'2-digit', year:'numeric',
        hour:'2-digit', minute:'2-digit'
      });
    } catch(e){ return iso; }
  };

  /* ---------- Toast ---------- */
  function toast(msg, type){
    const t = document.getElementById('sforzaToast');
    if(!t) return alert(msg);
    t.textContent = msg;
    t.className = 'sforza-toast show ' + (type || '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.className = 'sforza-toast';
    }, 2600);
  }

  /* ---------- Vistas ---------- */
  function switchView(name){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const v = document.getElementById('view-' + name);
    if(v) v.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
      if(b.dataset.view) b.classList.toggle('active', b.dataset.view === name);
    });
    if(name === 'historial') renderHistory();
    if(name === 'biblioteca') renderLibrary();
  }

  /* ---------- Baraja ---------- */
  function renderDeckBar(){
    const bar = $('#deckBar');
    if(!bar) return;
    bar.innerHTML = '';
    Object.values(DECKS).forEach(d => {
      const el = document.createElement('div');
      el.className = 'deck-card' + (d.id === state.deckId ? ' active' : '');
      el.innerHTML = `<h3>${d.name}</h3><p>${d.description}</p>`;
      el.addEventListener('click', () => {
        if(d.id === state.deckId) return;
        state.deckId = d.id;
        state.selection = [];
        renderDeckBar();
        renderBoard();
        renderMeanings();
        updateCounter();
        refreshPickerSuits();
        refreshLibrary();
      });
      bar.appendChild(el);
    });
  }

  /* ---------- Tablero ---------- */
  function renderBoard(){
    const board = $('#readingBoard');
    if(!board) return;
    board.innerHTML = '';

    if(!state.selection.length){
      board.innerHTML = `
        <p class="hint" style="grid-column:1/-1;text-align:center;padding:30px">
          Aún no has seleccionado cartas. Pulsa <b>"+ Añadir carta"</b> para empezar.
        </p>`;
      return;
    }

    state.selection.forEach((sel, i) => {
      const card = findCard(state.deckId, sel.cardId);
      if(!card) return;
      const el = document.createElement('div');
      el.className = 'slot filled' + (sel.inverted ? ' inverted' : '');
      el.innerHTML = `
        <div class="slot-symbol">${symbolFor(card)}</div>
        <div class="slot-card-name">${card.n}</div>
        <div class="slot-actions">
          <button class="icon-btn" title="Invertir" data-inv="${i}">⟲</button>
          <button class="icon-btn" title="Quitar" data-del="${i}">✕</button>
        </div>`;

      el.addEventListener('click', ev => {
        if(ev.target.dataset.inv !== undefined){
          const idx = +ev.target.dataset.inv;
          state.selection[idx].inverted = !state.selection[idx].inverted;
          renderBoard(); renderMeanings(); return;
        }
        if(ev.target.dataset.del !== undefined){
          const idx = +ev.target.dataset.del;
          state.selection.splice(idx, 1);
          renderBoard(); renderMeanings(); updateCounter(); return;
        }
      });

      board.appendChild(el);
    });
  }

  /* ---------- Significados ---------- */
  function meaningBlock(card, inverted){
    if(card.g !== undefined){
      return `
        <p><b>General:</b> ${escapeHtml(inverted ? card.inv : card.g)}</p>
        ${!inverted ? `
          <p><b>Salud:</b> ${escapeHtml(card.sa || '')}</p>
          <p><b>Trabajo:</b> ${escapeHtml(card.tr || '')}</p>
          <p><b>Amor:</b> ${escapeHtml(card.am || '')}</p>
          <p><b>Consejo:</b> ${escapeHtml(card.co || '')}</p>
        ` : `
          <p><b>Consejo invertida:</b> ${escapeHtml(card.coi || '')}</p>
        `}
      `;
    }
    if(card.gd !== undefined){
      const hasDetail = card.sad || card.td || card.ad || card.cd;
      if(!hasDetail){
        return `<p><b>General:</b> ${escapeHtml(inverted ? card.gi : card.gd)}</p>`;
      }
      return `
        <p><b>General:</b> ${escapeHtml(inverted ? card.gi : card.gd)}</p>
        <p><b>Salud:</b> ${escapeHtml(inverted ? (card.sai || '—') : (card.sad || '—'))}</p>
        <p><b>Trabajo:</b> ${escapeHtml(inverted ? (card.ti || '—') : (card.td || '—'))}</p>
        <p><b>Amor:</b> ${escapeHtml(inverted ? (card.ai || '—') : (card.ad || '—'))}</p>
        <p><b>Consejo:</b> ${escapeHtml(inverted ? (card.ci || '—') : (card.cd || '—'))}</p>
      `;
    }
    return '<p>Sin significado cargado.</p>';
  }

  function renderMeanings(){
    const box = $('#meanings');
    if(!box) return;
    box.innerHTML = '';

    if(!state.selection.length){
      box.innerHTML = '<p class="hint">Los significados aparecerán aquí en cuanto añadas una carta.</p>';
      return;
    }

    state.selection.forEach((sel, i) => {
      const card = findCard(state.deckId, sel.cardId);
      if(!card) return;
      const el = document.createElement('div');
      el.className = 'meaning-card' + (sel.inverted ? ' reversed' : '');
      el.innerHTML = `
        <div class="meaning-head">
          <h3>${i+1}. ${escapeHtml(card.n)}</h3>
          <span class="tag ${sel.inverted ? 'inv' : 'dir'}">
            ${sel.inverted ? 'Invertida' : 'Derecha'}
          </span>
          <span class="tag">${escapeHtml(suitNameFor(card))}</span>
        </div>
        <div class="meaning-body">${meaningBlock(card, sel.inverted)}</div>
      `;
      box.appendChild(el);
    });
  }

  /* ---------- Contador ---------- */
  function updateCounter(){
    const c = $('#counter');
    if(!c) return;
    const n = state.selection.length;
    c.textContent = n === 0 ? '0 cartas seleccionadas'
                  : n === 1 ? '1 carta seleccionada'
                  : `${n} cartas seleccionadas`;
  }

  /* ---------- Selector de carta ---------- */
  function openPicker(){
    const modal = $('#pickerModal');
    if(!modal) return;
    const search  = $('#pickerSearch');
    const suitSel = $('#pickerSuit');
    if(search)  search.value  = '';
    if(suitSel) suitSel.value = '';
    refreshPickerSuits();
    renderPicker();
    modal.classList.add('open');
    if(search) setTimeout(()=> search.focus(), 50);
  }

  function refreshPickerSuits(){
    const sel = $('#pickerSuit');
    if(!sel) return;
    sel.innerHTML = '<option value="">Todos los palos</option>';
    Object.entries(deck().suits).forEach(([k,v])=>{
      sel.insertAdjacentHTML('beforeend', `<option value="${k}">${v.name}</option>`);
    });
  }

  function renderPicker(){
    const grid  = $('#pickerGrid');
    if(!grid) return;
    const q     = ($('#pickerSearch')?.value || '').toLowerCase().trim();
    const suit  = ($('#pickerSuit')?.value || '');
    grid.innerHTML = '';
    deck().cards
      .filter(c => !suit || (c.s || c.type) === suit)
      .filter(c => !q || c.n.toLowerCase().includes(q))
      .forEach(card => {
        const el = document.createElement('div');
        el.className = 'picker-item';
        el.innerHTML = `
          <div class="sym">${symbolFor(card)}</div>
          <div class="nm">${escapeHtml(card.n)}</div>
          <div class="sv">${escapeHtml(suitNameFor(card))}</div>
        `;
        el.addEventListener('click', () => {
          state.selection.push({ cardId: card.id, inverted: false });
          $('#pickerModal').classList.remove('open');
          renderBoard(); renderMeanings(); updateCounter();
        });
        grid.appendChild(el);
      });
  }

  /* ---------- Guardar lectura ---------- */
  async function saveReading(){
    if(!state.selection.length){
      toast('No hay cartas para guardar.', 'err');
      return;
    }
    if(!window.SforzaAuth || !window.SforzaAuth.isLogged()){
      toast('Sesión expirada. Vuelve a entrar.', 'err');
      return;
    }

    const notaEl = $('#readingNote');
    const nota = notaEl ? notaEl.value.trim() : '';

    const cardsPayload = state.selection.map(sel => {
      const card = findCard(state.deckId, sel.cardId);
      return {
        id: card.id,
        n: card.n,
        inverted: sel.inverted
      };
    });

    const btn = $('#saveBtn');
    if(btn){ btn.disabled = true; btn.textContent = 'Guardando…'; }

    const res = await window.SupabaseClient.saveReading({
      deck_id: state.deckId,
      cards: cardsPayload,
      nota
    });

    if(btn){ btn.disabled = false; btn.textContent = 'Guardar lectura'; }

    if(!res.ok){
      toast('Error: ' + (res.error || 'desconocido'), 'err');
      return;
    }

    toast('✔ Lectura guardada', 'ok');

    // Limpiar tirada y nota
    state.selection = [];
    if(notaEl) notaEl.value = '';
    renderBoard();
    renderMeanings();
    updateCounter();
  }

  /* ---------- Historial ---------- */
  async function renderHistory(){
    const list = $('#historyList');
    if(!list) return;
    list.innerHTML = '<p class="hint">Cargando…</p>';

    const res = await window.SupabaseClient.getReadings();
    if(!res.ok){
      list.innerHTML = `<p class="hint">Error: ${escapeHtml(res.error)}</p>`;
      return;
    }

    if(!res.data.length){
      list.innerHTML = '<p class="hint">Todavía no hay lecturas guardadas.</p>';
      return;
    }

    list.innerHTML = '';
    res.data.forEach(r => {
      const deckName = (DECKS[r.deck_id] && DECKS[r.deck_id].name) || r.deck_id;
      const cardsHtml = (r.cards || []).map(c =>
        `<p>• <b>${escapeHtml(c.n)}</b>${c.inverted ? ' <em>(invertida)</em>' : ''}</p>`
      ).join('');

      const el = document.createElement('div');
      el.className = 'history-item';
      el.innerHTML = `
        <header>
          <h4>${escapeHtml(deckName)}</h4>
          <time>${escapeHtml(fmtDate(r.created_at))}</time>
        </header>
        ${cardsHtml}
        <div class="history-note">
          <label class="history-note-label">Nota</label>
          <textarea class="history-note-input" data-id="${r.id}" rows="3" placeholder="Escribe una nota sobre esta lectura...">${escapeHtml(r.nota || '')}</textarea>
          <div class="history-actions">
            <button class="btn small" data-save="${r.id}">Guardar nota</button>
            <button class="btn ghost small" data-export="${r.id}">Exportar .txt</button>
            <button class="btn ghost small danger" data-del="${r.id}">Borrar</button>
          </div>
        </div>
      `;
      list.appendChild(el);
    });

    // Guardar nota individual
    list.querySelectorAll('[data-save]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.save;
        const ta = list.querySelector(`textarea[data-id="${id}"]`);
        const nuevaNota = ta ? ta.value.trim() : '';
        btn.disabled = true;
        btn.textContent = 'Guardando…';
        const r = await window.SupabaseClient.updateReading(id, nuevaNota);
        btn.disabled = false;
        btn.textContent = 'Guardar nota';
        if(!r.ok){ toast('Error: ' + r.error, 'err'); return; }
        toast('✔ Nota guardada', 'ok');
      });
    });

    // Exportar
    list.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.export;
        const item = res.data.find(x => String(x.id) === String(id));
        if(!item) return;
        const ta = list.querySelector(`textarea[data-id="${id}"]`);
        exportReading(item, ta ? ta.value : '');
      });
    });

    // Borrar
    list.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(!confirm('¿Borrar esta lectura?')) return;
        const id = btn.dataset.del;
        const r = await window.SupabaseClient.deleteReading(id);
        if(!r.ok){ toast('Error: ' + r.error, 'err'); return; }
        toast('Lectura borrada', 'ok');
        renderHistory();
      });
    });
  }

  /* ---------- Exportar a .txt ---------- */
  function exportReading(item, nota){
    const deckName = (DECKS[item.deck_id] && DECKS[item.deck_id].name) || item.deck_id;
    const lineas = [];
    lineas.push('═══════════════════════════════════');
    lineas.push('SFORZAMEANINGS · Lectura de tarot');
    lineas.push('═══════════════════════════════════');
    lineas.push('');
    lineas.push('Baraja: ' + deckName);
    lineas.push('Fecha: ' + fmtDate(item.created_at));
    lineas.push('');
    lineas.push('CARTAS:');
    (item.cards || []).forEach(c => {
      lineas.push('  • ' + c.n + (c.inverted ? ' (invertida)' : ''));
    });
    lineas.push('');
    lineas.push('NOTA DEL TAROTISTA:');
    lineas.push(nota || '(sin nota)');
    lineas.push('');
    lineas.push('═══════════════════════════════════');

    const texto = lineas.join('\n');
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date(item.created_at).toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url;
    a.download = `sforzameanings-lectura-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------- Biblioteca ---------- */
  function refreshLibrary(){
    const selDeck = $('#libDeck');
    if(!selDeck) return;
    selDeck.innerHTML = Object.values(DECKS)
      .map(d => `<option value="${d.id}" ${d.id===state.deckId?'selected':''}>${d.name}</option>`).join('');
    refreshLibSuits();
    renderLibrary();
  }
  function refreshLibSuits(){
    const sel = $('#libSuit');
    if(!sel) return;
    sel.innerHTML = '<option value="">Todos los palos</option>';
    Object.entries(deck().suits).forEach(([k,v])=>{
      sel.insertAdjacentHTML('beforeend', `<option value="${k}">${v.name}</option>`);
    });
  }
  function renderLibrary(){
    const q = ($('#libSearch')?.value || '').toLowerCase().trim();
    const suit = $('#libSuit')?.value || '';
    const grid = $('#libraryGrid');
    if(!grid) return;
    grid.innerHTML = '';
    deck().cards
      .filter(c => !suit || (c.s || c.type) === suit)
      .filter(c => !q || c.n.toLowerCase().includes(q))
      .forEach(card => {
        const el = document.createElement('div');
        el.className = 'lib-item';
        el.innerHTML = `
          <div class="sym">${symbolFor(card)}</div>
          <div class="nm">${escapeHtml(card.n)}</div>
          <div class="sv">${escapeHtml(suitNameFor(card))}</div>`;
        el.addEventListener('click', () => openLibraryDetail(card));
        grid.appendChild(el);
      });
  }
  function openLibraryDetail(card){
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop open';
    wrap.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3>${escapeHtml(card.n)} <span style="color:var(--text-muted);font-weight:400;font-size:14px">· ${escapeHtml(suitNameFor(card))}</span></h3>
          <button class="close-btn">✕</button>
        </div>
        <div style="padding:20px 22px;overflow-y:auto">
          <div class="meaning-card">
            <div class="meaning-head"><h3>Derecha</h3></div>
            <div class="meaning-body">${meaningBlock(card, false)}</div>
          </div>
          <div class="meaning-card reversed" style="margin-top:16px">
            <div class="meaning-head"><h3>Invertida</h3><span class="tag inv">Reversa</span></div>
            <div class="meaning-body">${meaningBlock(card, true)}</div>
          </div>
        </div>
      </div>`;
    wrap.querySelector('.close-btn').addEventListener('click', ()=> wrap.remove());
    wrap.addEventListener('click', e => { if(e.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {

    // Nav
    document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
      b.addEventListener('click', () => switchView(b.dataset.view));
    });

    // Botones lectura
    const addCardBtn = $('#addCardBtn');
    if(addCardBtn) addCardBtn.addEventListener('click', openPicker);

    const clearBtn = $('#clearBtn');
    if(clearBtn){
      clearBtn.addEventListener('click', () => {
        state.selection = [];
        const notaEl = $('#readingNote');
        if(notaEl) notaEl.value = '';
        renderBoard(); renderMeanings(); updateCounter();
      });
    }
    const saveBtn = $('#saveBtn');
    if(saveBtn) saveBtn.addEventListener('click', saveReading);

    // Picker
    const pickerSearch = $('#pickerSearch');
    if(pickerSearch) pickerSearch.addEventListener('input', renderPicker);
    const pickerSuit = $('#pickerSuit');
    if(pickerSuit) pickerSuit.addEventListener('change', renderPicker);

    // Cerrar modales
    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.close;
        const modal = document.getElementById(id);
        if(modal) modal.classList.remove('open');
      });
    });
    const pickerModal = $('#pickerModal');
    if(pickerModal){
      pickerModal.addEventListener('click', e => {
        if(e.target.id === 'pickerModal') e.target.classList.remove('open');
      });
    }

    // Biblioteca
    const libSearch = $('#libSearch');
    if(libSearch) libSearch.addEventListener('input', renderLibrary);
    const libSuit = $('#libSuit');
    if(libSuit) libSuit.addEventListener('change', renderLibrary);
    const libDeck = $('#libDeck');
    if(libDeck){
      libDeck.addEventListener('change', e => {
        state.deckId = e.target.value;
        state.selection = [];
        renderBoard(); renderMeanings(); updateCounter();
        refreshLibSuits();
        renderLibrary();
        renderDeckBar();
      });
    }

    // Al entrar (login), recargar historial si estamos ahí
    window.addEventListener('sforza:login', () => {
      const hv = document.getElementById('view-historial');
      if(hv && hv.classList.contains('active')) renderHistory();
    });

    // Primera pintada
    renderDeckBar();
    renderBoard();
    renderMeanings();
    updateCounter();
    refreshPickerSuits();
    refreshLibrary();
  });

})();