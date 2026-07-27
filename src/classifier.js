// Classificação de mensagens nas categorias definidas pela skill.
// A ordem importa: price_inquiry é verificada PRIMEIRO porque é uma
// regra inviolável nunca sugerir resposta para perguntas de preço.

export const CATEGORIES = {
  price_inquiry: {
    key: 'price_inquiry',
    label: 'Pergunta sobre preço',
    emoji: '🔴',
    action: 'manual',
    suggestReply: false,
    description: 'Fila de aprovação manual — não sugerir resposta.',
  },
  registration_interest: {
    key: 'registration_interest',
    label: 'Interesse em se inscrever',
    emoji: '🟢',
    action: 'reply_and_lead',
    suggestReply: true,
    description: 'Gerar resposta e coletar dados do lead.',
  },
  complaint: {
    key: 'complaint',
    label: 'Reclamação',
    emoji: '🟡',
    action: 'reply_flagged',
    suggestReply: true,
    description: 'Resposta empática — sinalizar para atenção.',
  },
  testimonial_or_praise: {
    key: 'testimonial_or_praise',
    label: 'Elogio / testemunho',
    emoji: '🟢',
    action: 'reply',
    suggestReply: true,
    description: 'Resposta de agradecimento.',
  },
  spam_or_irrelevant: {
    key: 'spam_or_irrelevant',
    label: 'Spam / irrelevante',
    emoji: '⚪',
    action: 'ignore',
    suggestReply: false,
    description: 'Ignorar (confirmar com o usuário).',
  },
  general_question: {
    key: 'general_question',
    label: 'Dúvida geral',
    emoji: '🟢',
    action: 'reply',
    suggestReply: true,
    description: 'Resposta baseada no histórico.',
  },
};

const KEYWORDS = {
  price_inquiry: [
    'preço', 'precos', 'preços', 'valor', 'valores', 'custo', 'custa',
    'quanto', 'investimento', 'mensalidade', 'parcel', 'desconto',
    'price', 'prices', 'cost', 'how much', 'fee', 'fees', 'pricing',
    'precio', 'precios', 'cuánto', 'cuanto', 'cuesta', 'coût', 'cout',
    'prix', 'combien', 'prezzo', 'quanto costa', 'orçamento', 'quanto é',
  ],
  spam_or_irrelevant: [
    'follow back', 'siga de volta', 'segue de volta', 'f4f', 'l4l',
    'sorteio', 'giveaway', 'check my', 'dm me', 'seguidores grátis',
    'seguidores gratis', 'free followers', 'ganhe dinheiro', 'gana dinero',
    'earn money', 'make money', 'crypto', 'bitcoin', 'forex', 'invest now',
    'promo code', 'click here', 'clique aqui', 'www.', 'http://', 'bit.ly',
  ],
  complaint: [
    'reclam', 'problema', 'não funciona', 'nao funciona', 'péssimo',
    'pessimo', 'horrível', 'horrivel', 'ruim', 'decepcion', 'insatisfeit',
    'complaint', 'terrible', 'awful', 'worst', 'refund', 'reembolso',
    'cancelar', 'cancel', 'disappointed', 'angry', 'scam', 'golpe',
    'não recebi', 'nao recebi', 'demora', 'atraso', 'no funciona',
  ],
  registration_interest: [
    'inscrev', 'inscric', 'inscrição', 'inscricao', 'inscrib', 'matricul',
    'quero participar', 'quero me', 'como participo', 'como faço', 'como faco',
    'sign up', 'signup', 'register', 'enroll', 'join', 'how do i join',
    'want to join', 'i want to', 'apuntar', 'apuntarme', 'inscription',
    'iscriv', 'quiero unirme', 'quero entrar', 'como entro', 'começar',
    'comecar', 'get started', 'saber mais', 'more info', 'interessad',
  ],
  testimonial_or_praise: [
    'obrigad', 'adorei', 'amei', 'excelente', 'ótimo', 'otimo',
    'maravilhos', 'parabéns', 'parabens', 'incrível', 'incrivel', 'perfeito',
    'melhor', 'love', 'loved', 'amazing', 'awesome', 'great', 'excellent',
    'thank', 'thanks', 'gracias', 'merci', 'grazie', 'fantástico',
    'fantastico', 'top', 'sensacional', 'recomendo',
  ],
};

function matches(textLower, list) {
  return list.some((kw) => textLower.includes(kw));
}

export function classify(text) {
  const lower = (text || '').toLowerCase();

  // Prioridade de segurança: preço sempre vence.
  if (matches(lower, KEYWORDS.price_inquiry)) return CATEGORIES.price_inquiry;
  if (matches(lower, KEYWORDS.spam_or_irrelevant)) return CATEGORIES.spam_or_irrelevant;
  if (matches(lower, KEYWORDS.complaint)) return CATEGORIES.complaint;
  if (matches(lower, KEYWORDS.registration_interest)) return CATEGORIES.registration_interest;
  if (matches(lower, KEYWORDS.testimonial_or_praise)) return CATEGORIES.testimonial_or_praise;

  return CATEGORIES.general_question;
}
