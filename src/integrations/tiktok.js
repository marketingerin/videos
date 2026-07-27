// Adaptador da TikTok API for Business.
// Só é usado quando TIKTOK_ACCESS_TOKEN está definido.

import { config } from '../config.js';

const BASE = 'https://open.tiktokapis.com';

async function tk(path, { method = 'GET', body = null, query = {} } = {}) {
  const url = new URL(`${BASE}/${path.replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(query)) {
    if (v != null) url.searchParams.set(k, v);
  }
  const opts = {
    method,
    headers: { Authorization: `Bearer ${config.tiktok.accessToken}` },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(`TikTok API: ${msg}`);
  }
  return data;
}

export async function fetchMessages() {
  const results = [];
  try {
    const data = await tk('v2/dm/conversation/list/', {
      query: { fields: 'conversation_id,latest_message,unread_count,participant_open_id' },
    });
    const convos = data?.data?.conversations || data?.conversations || [];
    for (const c of convos) {
      if ((c.unread_count || 0) <= 0) continue;
      const m = c.latest_message || {};
      results.push({
        platform: 'tiktok',
        type: 'direct',
        sender_name: c.participant_open_id || 'Usuário TikTok',
        sender_id: c.conversation_id,
        message_text: m.content?.text || m.text || '',
        timestamp: m.create_time
          ? new Date(Number(m.create_time) * 1000).toISOString()
          : new Date(0).toISOString(),
        post_url: null,
      });
    }
  } catch (err) {
    console.error('[tiktok] falha ao buscar DMs:', err.message);
  }
  return results.filter((m) => m.message_text.trim().length > 0);
}

export async function sendReply(item, text) {
  if (item.type === 'comment') {
    await tk('v2/comment/reply/', {
      method: 'POST',
      body: { parent_comment_id: item.sender_id, text },
    });
    return { channel: 'tiktok:comment' };
  }
  await tk('v2/dm/message/send/', {
    method: 'POST',
    body: {
      conversation_id: item.sender_id,
      message: { message_type: 'text', content: { text } },
    },
  });
  return { channel: 'tiktok:direct' };
}
