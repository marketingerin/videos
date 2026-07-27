// Adaptador da Meta Graph API (Instagram + Facebook).
// Só é usado quando META_PAGE_ACCESS_TOKEN e META_PAGE_ID estão definidos.
// Todas as chamadas são defensivas: falhas de rede não derrubam o app.

import { config } from '../config.js';

const BASE = () => `https://graph.facebook.com/${config.meta.apiVersion}`;

async function graph(path, { method = 'GET', body = null, query = {} } = {}) {
  const url = new URL(`${BASE()}/${path.replace(/^\//, '')}`);
  url.searchParams.set('access_token', config.meta.accessToken);
  for (const [k, v] of Object.entries(query)) {
    if (v != null) url.searchParams.set(k, v);
  }
  const opts = { method };
  if (body) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Meta Graph API: ${msg}`);
  }
  return data;
}

function normalizeConversation(platform, convo) {
  const out = [];
  const msgs = convo?.messages?.data || [];
  for (const m of msgs) {
    // Ignora mensagens enviadas pela própria página (from.id === pageId).
    if (m.from?.id && m.from.id === config.meta.pageId) continue;
    out.push({
      platform,
      type: 'direct',
      sender_name: m.from?.name || m.from?.username || 'Usuário',
      sender_id: m.from?.id || convo.id,
      message_text: m.message || '',
      timestamp: m.created_time || new Date(0).toISOString(),
      post_url: null,
    });
  }
  return out;
}

async function fetchConversations(platform) {
  const query = {
    fields: 'id,messages{id,message,from,created_time}',
    limit: 25,
  };
  if (platform === 'instagram') query.platform = 'instagram';
  const data = await graph('me/conversations', { query });
  const convos = data?.data || [];
  return convos.flatMap((c) => normalizeConversation(platform, c))
    .filter((m) => m.message_text.trim().length > 0);
}

// Busca directs de Instagram e Facebook. Comentários exigem enumerar posts;
// mantido fora do caminho padrão para evitar consumo de rate limit.
export async function fetchMessages() {
  const results = [];
  for (const platform of ['instagram', 'facebook']) {
    try {
      const msgs = await fetchConversations(platform);
      results.push(...msgs);
    } catch (err) {
      console.error(`[meta] falha ao buscar ${platform}:`, err.message);
    }
  }
  return results;
}

export async function sendReply(item, text) {
  if (item.type === 'comment') {
    // Resposta a comentário: IG usa /replies, FB usa /comments.
    const edge = item.platform === 'instagram' ? 'replies' : 'comments';
    await graph(`${item.sender_id}/${edge}`, {
      method: 'POST',
      body: { message: text },
    });
    return { channel: `${item.platform}:comment` };
  }
  // Direct message.
  await graph('me/messages', {
    method: 'POST',
    body: {
      recipient: { id: item.sender_id },
      message: { text },
      messaging_type: 'RESPONSE',
    },
  });
  return { channel: `${item.platform}:direct` };
}
