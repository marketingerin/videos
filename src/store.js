// Armazenamento em memória do inbox. Cada mensagem é enriquecida com
// classificação, idioma, resposta sugerida e dados de lead, e recebe um id
// estável. O estado (pendente/aprovado/ignorado) vive aqui durante a sessão.

import crypto from 'node:crypto';
import { classify } from './classifier.js';
import { detectLanguage, languageName } from './language.js';
import { generateReply } from './replyGenerator.js';
import { extractLead } from './leadExtractor.js';

function stableId(raw) {
  const basis = `${raw.platform}|${raw.type}|${raw.sender_id}|${raw.timestamp}|${raw.message_text}`;
  return crypto.createHash('sha1').update(basis).digest('hex').slice(0, 12);
}

export function enrich(raw) {
  const category = classify(raw.message_text);
  const language = detectLanguage(raw.message_text);
  const reply = generateReply(category, language, raw.sender_name);
  const lead = extractLead(raw.message_text, language);

  return {
    id: stableId(raw),
    platform: raw.platform,
    type: raw.type,
    sender_name: raw.sender_name,
    sender_id: raw.sender_id,
    message_text: raw.message_text,
    timestamp: raw.timestamp,
    post_url: raw.post_url || null,

    detected_language: language,
    language_name: languageName(language),
    category: category.key,
    category_label: category.label,
    category_emoji: category.emoji,
    category_action: category.action,
    needs_manual: !category.suggestReply && category.key === 'price_inquiry',

    suggested_reply: reply.text,
    reply_generated: reply.generated,
    lead,

    status: 'pending', // pending | approved | ignored
    result: null, // preenchido após aprovação (envio + CRM)
  };
}

class InboxStore {
  constructor() {
    this.items = new Map();
    this.lastSync = null;
  }

  // Substitui/mescla o conjunto de mensagens preservando o estado local
  // (drafts editados, status) de itens já conhecidos.
  replaceAll(rawMessages) {
    const seen = new Set();
    for (const raw of rawMessages) {
      const enriched = enrich(raw);
      seen.add(enriched.id);
      const existing = this.items.get(enriched.id);
      if (existing) {
        // Mantém edições e decisões do usuário.
        enriched.suggested_reply = existing.suggested_reply;
        enriched.status = existing.status;
        enriched.result = existing.result;
      }
      this.items.set(enriched.id, enriched);
    }
    this.lastSync = new Date().toISOString();
    return this.list();
  }

  list() {
    return Array.from(this.items.values()).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );
  }

  get(id) {
    return this.items.get(id) || null;
  }

  setReply(id, text) {
    const item = this.items.get(id);
    if (!item) return null;
    item.suggested_reply = text;
    return item;
  }

  setStatus(id, status, result = null) {
    const item = this.items.get(id);
    if (!item) return null;
    item.status = status;
    if (result) item.result = result;
    return item;
  }
}

export const store = new InboxStore();
