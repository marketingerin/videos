// Adaptador do ActiveCampaign (API v3).
// Implementa os três casos da skill:
//   CASO 1 — contato novo: cria, preenche campos, adiciona à lista "Meta Ads".
//   CASO 2 — contato existente com deal do owner "Oner": adiciona nota.
//   CASO 3 — contato existente com deal "Lost": reativa, anota, reinscreve.
// Só é usado quando ACTIVECAMPAIGN_BASE_URL e ACTIVECAMPAIGN_API_TOKEN existem.

import { config } from '../config.js';

const AC = () => config.activecampaign;

async function ac(path, { method = 'GET', body = null, query = {} } = {}) {
  const url = new URL(`${AC().baseUrl}/api/3/${path.replace(/^\//, '')}`);
  for (const [k, v] of Object.entries(query)) {
    if (v != null) url.searchParams.set(k, v);
  }
  const opts = {
    method,
    headers: { 'Api-Token': AC().apiToken, Accept: 'application/json' },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || JSON.stringify(data?.errors || {}) || `HTTP ${res.status}`;
    throw new Error(`ActiveCampaign: ${msg}`);
  }
  return data;
}

async function findFieldIdByTag(perstag) {
  const data = await ac('fields', { query: { limit: 100 } });
  const field = (data.fields || []).find(
    (f) => (f.perstag || '').toUpperCase() === perstag.toUpperCase(),
  );
  return field ? field.id : null;
}

async function setFieldValue(contactId, perstag, value) {
  if (!value) return;
  const fieldId = await findFieldIdByTag(perstag);
  if (!fieldId) return; // campo customizado inexistente — ignora silenciosamente
  await ac('fieldValues', {
    method: 'POST',
    body: { fieldValue: { contact: contactId, field: fieldId, value } },
  });
}

async function findListIdByName(name) {
  const data = await ac('lists', { query: { 'filters[name]': name } });
  const list = (data.lists || []).find((l) => l.name === name) || (data.lists || [])[0];
  return list ? list.id : null;
}

async function addContactToList(contactId, listName) {
  const listId = await findListIdByName(listName);
  if (!listId) throw new Error(`Lista "${listName}" não encontrada`);
  await ac('contactLists', {
    method: 'POST',
    body: { contactList: { list: listId, contact: contactId, status: 1 } },
  });
  return listId;
}

async function findContact({ email, name }) {
  if (email) {
    const data = await ac('contacts', { query: { email } });
    if ((data.contacts || []).length) return data.contacts[0];
  }
  if (name) {
    const data = await ac('contacts', { query: { search: name } });
    if ((data.contacts || []).length) return data.contacts[0];
  }
  return null;
}

async function findOwnerId(ownerName) {
  const data = await ac('users');
  const users = data.users || [];
  const match = users.find(
    (u) =>
      (u.username || '').toLowerCase() === ownerName.toLowerCase() ||
      `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase() ===
        ownerName.toLowerCase(),
  );
  return match ? match.id : null;
}

async function addNoteToDeal(dealId, text) {
  await ac('notes', {
    method: 'POST',
    body: { note: { note: text, reltype: 'deal', relid: dealId } },
  });
}

function buildNote(item, kind) {
  const stamp = item.timestamp;
  if (kind === 'returning_lost') {
    return (
      `O cliente ${item.sender_name} retornou via direct ${item.platform} ` +
      `após ter sido marcado como Lost.\n\n` +
      `Mensagem enviada:\n'${item.message_text}'\n\nData: ${stamp}`
    );
  }
  return (
    `O cliente ${item.sender_name} entrou novamente via direct ${item.platform}.\n\n` +
    `Mensagem enviada:\n'${item.message_text}'\n\nData: ${stamp}`
  );
}

// Processa o lead conforme os 3 casos. Retorna um resumo do que foi feito.
export async function processLead(item) {
  const { lead } = item;
  const placeholderEmail = `${item.platform}_${item.sender_id}@social.placeholder`;
  const email = lead.email || placeholderEmail;

  const existing = await findContact({
    email: lead.email,
    name: item.sender_name,
  });

  // ── CASO 1 — contato novo ──
  if (!existing) {
    const created = await ac('contacts', {
      method: 'POST',
      body: {
        contact: {
          email,
          firstName: (item.sender_name || '').split(/\s+/)[0] || item.sender_name,
          lastName: (item.sender_name || '').split(/\s+/).slice(1).join(' '),
          phone: lead.phone || '',
        },
      },
    });
    const contactId = created.contact.id;
    await setFieldValue(contactId, 'ORIGEM_LEAD', item.platform);
    await setFieldValue(contactId, 'PAIS_ORIGEM', lead.country || '');
    await setFieldValue(contactId, 'MENSAGEM_ORIGINAL', item.message_text);
    const listId = await addContactToList(contactId, AC().listName);
    return {
      case: 'new_contact',
      contactId,
      listId,
      summary: `Novo contato criado e adicionado à lista "${AC().listName}".`,
    };
  }

  // Contato existente — localizar deal do owner configurado.
  const contactId = existing.id;
  const ownerId = await findOwnerId(AC().dealOwner);
  const dealsData = await ac(`contacts/${contactId}/deals`).catch(() => ({ deals: [] }));
  const deals = dealsData.deals || [];
  const ownerDeal =
    deals.find((d) => ownerId && String(d.owner) === String(ownerId)) || deals[0];

  if (!ownerDeal) {
    // Existe contato mas sem deal — apenas registra a nova interação.
    return {
      case: 'existing_no_deal',
      contactId,
      summary: 'Contato já existia, sem deal associado. Nenhum deal alterado.',
    };
  }

  // ── CASO 3 — deal com status Lost (2) ──
  if (Number(ownerDeal.status) === 2) {
    await ac(`deals/${ownerDeal.id}`, {
      method: 'PUT',
      body: { deal: { status: 0 } },
    });
    await addNoteToDeal(ownerDeal.id, buildNote(item, 'returning_lost'));
    const listId = await addContactToList(contactId, AC().listName);
    return {
      case: 'reactivated_lost',
      contactId,
      dealId: ownerDeal.id,
      listId,
      summary: `Deal reativado (Lost → Open), nota adicionada e contato reinscrito na lista "${AC().listName}".`,
    };
  }

  // ── CASO 2 — deal ativo/aberto ──
  await addNoteToDeal(ownerDeal.id, buildNote(item, 'returning'));
  return {
    case: 'note_added',
    contactId,
    dealId: ownerDeal.id,
    summary: 'Nota adicionada ao deal existente.',
  };
}
