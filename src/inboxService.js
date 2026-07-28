// Camada de serviço: orquestra busca de mensagens, envio de respostas e
// processamento de leads, escolhendo entre integrações reais e simulação
// (modo demo). Aplica as regras invioláveis da skill.

import { config, integrationStatus, isDemoMode } from './config.js';
import { store } from './store.js';
import { demoMessages } from './demoData.js';
import * as meta from './integrations/meta.js';
import * as tiktok from './integrations/tiktok.js';
import * as activecampaign from './integrations/activecampaign.js';

// ── Buscar mensagens não respondidas ──
export async function syncMessages() {
  if (isDemoMode) {
    return store.replaceAll(demoMessages);
  }
  const collected = [];
  if (integrationStatus.meta) collected.push(...(await meta.fetchMessages()));
  if (integrationStatus.tiktok) collected.push(...(await tiktok.fetchMessages()));
  // Se nada configurado retornou mensagens, cai para demo para manter o
  // painel utilizável (mas ainda marcado como live nas integrações ativas).
  return store.replaceAll(collected.length ? collected : demoMessages);
}

function platformAdapter(platform) {
  if (platform === 'tiktok') return tiktok;
  return meta; // instagram + facebook
}

async function doSend(item, text) {
  if (isDemoMode) {
    return { simulated: true, channel: `${item.platform}:${item.type}` };
  }
  const configured =
    (item.platform === 'tiktok' && integrationStatus.tiktok) ||
    (item.platform !== 'tiktok' && integrationStatus.meta);
  if (!configured) {
    return { simulated: true, channel: `${item.platform}:${item.type}` };
  }
  return platformAdapter(item.platform).sendReply(item, text);
}

async function doCrm(item) {
  if (item.category === 'spam_or_irrelevant') {
    return { skipped: true, summary: 'Spam — nenhuma ação no CRM.' };
  }
  if (isDemoMode || !integrationStatus.activecampaign) {
    return {
      simulated: true,
      summary: 'CRM simulado (ActiveCampaign não configurado).',
    };
  }
  return activecampaign.processLead(item);
}

// ── Aprovar e enviar (+ CRM) ──
export async function approveAndSend(id, providedText) {
  const item = store.get(id);
  if (!item) return { ok: false, error: 'Mensagem não encontrada.' };
  if (item.status !== 'pending') {
    return { ok: false, error: `Mensagem já está "${item.status}".` };
  }

  // REGRA INVIOLÁVEL: spam nunca deve ser respondido/enviado — só ignorado.
  if (item.category === 'spam_or_irrelevant') {
    return {
      ok: false,
      error: 'Mensagem classificada como spam. Use "Ignorar".',
    };
  }

  const manual = (providedText || '').trim();

  // REGRA INVIOLÁVEL: perguntas de preço exigem resposta manual do usuário.
  if (item.category === 'price_inquiry' && !manual) {
    return {
      ok: false,
      requiresManual: true,
      error:
        'Pergunta sobre preço exige resposta escrita manualmente antes do envio.',
    };
  }

  const finalText = manual || item.suggested_reply;
  if (!finalText) {
    return { ok: false, error: 'Nenhum texto de resposta disponível.' };
  }

  store.setReply(id, finalText);

  try {
    const sent = await doSend(item, finalText);
    const crm = await doCrm(item);
    const result = { sentAt: new Date().toISOString(), reply: finalText, sent, crm };
    store.setStatus(id, 'approved', result);
    return { ok: true, item: store.get(id) };
  } catch (err) {
    const result = { error: err.message, at: new Date().toISOString() };
    store.setStatus(id, 'pending', null);
    return { ok: false, error: err.message, item: store.get(id), detail: result };
  }
}

export function editReply(id, text) {
  const item = store.setReply(id, (text || '').trim());
  if (!item) return { ok: false, error: 'Mensagem não encontrada.' };
  return { ok: true, item };
}

export function ignore(id) {
  const item = store.get(id);
  if (!item) return { ok: false, error: 'Mensagem não encontrada.' };
  if (item.status === 'approved') {
    return { ok: false, error: 'Mensagem já foi respondida.' };
  }
  store.setStatus(id, 'ignored');
  return { ok: true, item: store.get(id) };
}

export function summary() {
  const items = store.list();
  const by = (pred) => items.filter(pred).length;
  return {
    total: items.length,
    pending: by((i) => i.status === 'pending'),
    approved: by((i) => i.status === 'approved'),
    ignored: by((i) => i.status === 'ignored'),
    price_queue: by((i) => i.category === 'price_inquiry' && i.status === 'pending'),
    lastSync: store.lastSync,
    listName: config.activecampaign.listName,
    dealOwner: config.activecampaign.dealOwner,
  };
}
