// Testes unitários das regras centrais (sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { classify, CATEGORIES } from '../src/classifier.js';
import { detectLanguage } from '../src/language.js';
import { generateReply } from '../src/replyGenerator.js';
import { extractLead } from '../src/leadExtractor.js';
import { enrich } from '../src/store.js';

test('preço é classificado como price_inquiry (regra inviolável)', () => {
  assert.equal(classify('Quanto custa a mentoria?').key, 'price_inquiry');
  assert.equal(classify('How much does it cost?').key, 'price_inquiry');
  assert.equal(classify('¿Cuánto cuesta?').key, 'price_inquiry');
  assert.equal(classify('Combien coûte la formation ?').key, 'price_inquiry');
});

test('preço vence mesmo combinado com elogio', () => {
  assert.equal(classify('Adorei! Quanto custa?').key, 'price_inquiry');
});

test('price_inquiry nunca gera resposta sugerida', () => {
  const r = generateReply(CATEGORIES.price_inquiry, 'pt', 'João');
  assert.equal(r.generated, false);
  assert.equal(r.text, '');
});

test('spam não gera resposta', () => {
  const c = classify('Follow back and check my crypto profile bit.ly/x');
  assert.equal(c.key, 'spam_or_irrelevant');
  assert.equal(generateReply(c, 'en', 'x').generated, false);
});

test('categorias respondíveis geram texto no idioma detectado', () => {
  const c = classify('Quero me inscrever no curso, como faço?');
  assert.equal(c.key, 'registration_interest');
  const r = generateReply(c, 'pt', 'Marina Alves');
  assert.equal(r.generated, true);
  assert.match(r.text, /Marina/);
});

test('detecção de idioma básica', () => {
  assert.equal(detectLanguage('Olá, gostaria de saber mais, obrigado!'), 'pt');
  assert.equal(detectLanguage('Hello, I would like more info please'), 'en');
  assert.equal(detectLanguage('Hola, quiero más información, gracias'), 'es');
});

test('extração de lead pega email e telefone', () => {
  const lead = extractLead('meu email é ana@teste.com e telefone +55 11 99999-8888', 'pt');
  assert.equal(lead.email, 'ana@teste.com');
  assert.ok(lead.phone.includes('55'));
  assert.equal(lead.country, 'Brasil');
});

test('enrich produz item completo e estável', () => {
  const raw = {
    platform: 'instagram', type: 'direct', sender_name: 'Marina',
    sender_id: 'ig_1', message_text: 'Quanto custa?', timestamp: '2026-07-27T09:00:00Z',
  };
  const a = enrich(raw);
  const b = enrich(raw);
  assert.equal(a.id, b.id); // id estável
  assert.equal(a.category, 'price_inquiry');
  assert.equal(a.needs_manual, true);
  assert.equal(a.status, 'pending');
});
