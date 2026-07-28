// Painel do Inbox Manager — lógica de frontend (vanilla JS, sem build).

const state = {
  messages: [],
  status: null,
  filter: 'all',
  token: new URLSearchParams(location.search).get('token') || null,
};

const els = {
  board: document.getElementById('board'),
  stats: document.getElementById('stats'),
  integrations: document.getElementById('integrations'),
  modeBadge: document.getElementById('mode-badge'),
  syncBtn: document.getElementById('sync-btn'),
  filters: document.getElementById('filters'),
  toast: document.getElementById('toast'),
  tpl: document.getElementById('card-template'),
};

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (state.token) h['x-inbox-token'] = state.token;
  return h;
}

async function api(pathname, opts = {}) {
  const res = await fetch(`/api${pathname}`, { headers: headers(), ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
  return data;
}

function toast(msg, isError = false) {
  els.toast.textContent = msg;
  els.toast.className = `toast${isError ? ' err' : ''}`;
  els.toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (els.toast.hidden = true), 3200);
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

function applyStatus(data) {
  state.status = data;
  const mode = data.mode;
  els.modeBadge.textContent = mode === 'live' ? 'Online · Live' : 'Online · Demo';
  els.modeBadge.className = `badge ${mode}`;

  const s = data.summary || {};
  els.stats.innerHTML = `
    <div class="stat"><div class="n">${s.total ?? 0}</div><div class="l">Total</div></div>
    <div class="stat pending"><div class="n">${s.pending ?? 0}</div><div class="l">Pendentes</div></div>
    <div class="stat price"><div class="n">${s.price_queue ?? 0}</div><div class="l">Fila de preço</div></div>
    <div class="stat approved"><div class="n">${s.approved ?? 0}</div><div class="l">Respondidas</div></div>
    <div class="stat"><div class="n">${s.ignored ?? 0}</div><div class="l">Ignoradas</div></div>
  `;

  const i = data.integrations || {};
  const row = (label, on) =>
    `<span class="int ${on ? 'on' : 'off'}"><span class="dot"></span>${label} ${on ? 'conectado' : 'demo'}</span>`;
  els.integrations.innerHTML =
    row('Instagram', i.instagram) +
    row('Facebook', i.facebook) +
    row('TikTok', i.tiktok) +
    row('ActiveCampaign', i.activecampaign) +
    `<span class="int"><span class="dot"></span>Lista CRM: <strong style="color:var(--text)">${s.listName || 'Meta Ads'}</strong></span>`;
}

function passesFilter(m) {
  switch (state.filter) {
    case 'pending': return m.status === 'pending';
    case 'approved': return m.status === 'approved';
    case 'ignored': return m.status === 'ignored';
    case 'price': return m.category === 'price_inquiry';
    default: return true;
  }
}

function render() {
  const list = state.messages.filter(passesFilter);
  els.board.innerHTML = '';
  if (!list.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'Nenhuma mensagem neste filtro. 🎉';
    els.board.appendChild(empty);
    return;
  }
  for (const m of list) els.board.appendChild(renderCard(m));
}

function renderCard(m) {
  const node = els.tpl.content.firstElementChild.cloneNode(true);
  if (m.status !== 'pending') node.classList.add('done');

  const pt = node.querySelector('.platform-tag');
  pt.textContent = m.platform;
  pt.classList.add(`platform-${m.platform}`);
  node.querySelector('.type-tag').textContent = m.type === 'direct' ? 'Direct' : 'Comentário';
  node.querySelector('.lang-tag').textContent = '🌐 ' + m.language_name;

  const st = node.querySelector('.status-tag');
  st.textContent = { pending: '⏳ Pendente', approved: '✅ Respondida', ignored: '🗑️ Ignorada' }[m.status];
  st.classList.add(`status-${m.status}`);

  node.querySelector('.sender').textContent = m.sender_name;
  node.querySelector('.time').textContent = fmtTime(m.timestamp);
  node.querySelector('.category').textContent = `${m.category_emoji} ${m.category_label}`;
  node.querySelector('.message').textContent = m.message_text;

  const link = node.querySelector('.post-link');
  if (m.post_url) { link.href = m.post_url; link.hidden = false; }

  const reply = node.querySelector('.reply');
  reply.value = m.suggested_reply || '';
  const isPrice = m.category === 'price_inquiry';
  const isSpam = m.category === 'spam_or_irrelevant';
  if (isPrice) {
    node.querySelector('.price-warning').hidden = false;
    reply.placeholder = 'Escreva sua resposta sobre valores manualmente…';
  }

  // Dicas de lead extraído.
  const lead = m.lead || {};
  if (lead.email || lead.phone) {
    const hints = node.querySelector('.lead-hints');
    hints.hidden = false;
    hints.innerHTML = 'Dados do lead detectados: ' +
      [lead.email && `<strong>${lead.email}</strong>`, lead.phone && `<strong>${lead.phone}</strong>`]
        .filter(Boolean).join(' · ');
  }

  const approveBtn = node.querySelector('.btn-approve');
  const ignoreBtn = node.querySelector('.btn-ignore');
  const resultBox = node.querySelector('.result');

  if (m.status !== 'pending') {
    approveBtn.disabled = true;
    ignoreBtn.disabled = true;
    reply.disabled = true;
    if (m.status === 'approved' && m.result) {
      resultBox.hidden = false;
      resultBox.className = 'result ok';
      resultBox.innerHTML =
        `Enviada ${fmtTime(m.result.sentAt)}` +
        (m.result.crm?.summary ? `<br>CRM: ${m.result.crm.summary}` : '') +
        (m.result.sent?.simulated ? '<br><em>(envio simulado — modo demo)</em>' : '');
    }
  }

  if (isSpam) {
    approveBtn.disabled = true;
    approveBtn.title = 'Spam não deve ser respondido';
  }

  approveBtn.addEventListener('click', () => onApprove(m, reply, node));
  ignoreBtn.addEventListener('click', () => onIgnore(m));
  return node;
}

async function onApprove(m, replyEl, node) {
  const text = replyEl.value.trim();
  if (m.category === 'price_inquiry' && !text) {
    toast('Escreva uma resposta manual para perguntas de preço.', true);
    replyEl.focus();
    return;
  }
  const btn = node.querySelector('.btn-approve');
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  try {
    const data = await api(`/messages/${m.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
    toast('Resposta enviada com sucesso ✅');
    await refresh(false);
  } catch (err) {
    toast(err.message, true);
    btn.disabled = false;
    btn.textContent = '✅ Aprovar e Enviar';
  }
}

async function onIgnore(m) {
  try {
    await api(`/messages/${m.id}/ignore`, { method: 'POST' });
    toast('Mensagem ignorada.');
    await refresh(false);
  } catch (err) {
    toast(err.message, true);
  }
}

async function refresh(sync) {
  try {
    const data = await api(`/messages${sync ? '?sync=1' : ''}`);
    state.messages = data.messages || [];
    applyStatus(data);
    render();
  } catch (err) {
    if (String(err.message).includes('autoriz')) {
      const t = prompt('Token de acesso do painel:');
      if (t) { state.token = t; return refresh(sync); }
    }
    toast(err.message, true);
    els.board.innerHTML = `<div class="empty">Erro: ${err.message}</div>`;
  }
}

// ── Eventos ──
els.syncBtn.addEventListener('click', async () => {
  els.syncBtn.disabled = true;
  els.syncBtn.textContent = '↻ Atualizando…';
  await refresh(true);
  els.syncBtn.disabled = false;
  els.syncBtn.textContent = '↻ Atualizar';
});

els.filters.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  state.filter = chip.dataset.filter;
  els.filters.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
  render();
});

refresh(true);
