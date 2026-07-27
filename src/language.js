// Detecção de idioma leve e sem dependências externas.
// Cobre os idiomas mais comuns do público (PT, EN, ES, FR, IT) via
// pontuação por marcadores característicos. Retorna código ISO curto.

const MARKERS = {
  pt: [
    'ção', 'ções', 'não', 'você', 'vocês', 'obrigado', 'obrigada', 'olá',
    'quanto', 'muito', 'está', 'são', 'gostaria', 'vc', 'pra', 'também',
    'preço', 'valores', 'inscrição', 'dúvida', 'bom dia', 'boa tarde',
  ],
  es: [
    'gracias', 'hola', 'cómo', 'cuánto', 'quiero', 'precio', 'señor',
    'está', 'buenos días', 'buenas', 'ustedes', 'ñ', '¿', '¡', 'inscribir',
    'información', 'muchas', 'saludos',
  ],
  fr: [
    'bonjour', 'merci', 'combien', 'prix', 'comment', 'vous', "s'il",
    'être', 'salut', 'je voudrais', 'coût', "j'aimerais", 'inscription',
    'bonsoir',
  ],
  it: [
    'ciao', 'grazie', 'quanto', 'prezzo', 'come', 'sono', 'per favore',
    'vorrei', 'buongiorno', 'costo', 'iscrizione', 'salve',
  ],
  en: [
    'the', 'you', 'how', 'much', 'price', 'thanks', 'thank you', 'hello',
    'hi', 'want', 'would', 'please', 'cost', 'register', 'sign up',
    'info', 'i would', "i'd",
  ],
};

const NAMES = {
  pt: 'Português',
  es: 'Espanhol',
  fr: 'Francês',
  it: 'Italiano',
  en: 'Inglês',
};

export function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  const lower = ` ${text.toLowerCase()} `;
  const scores = {};

  for (const [lang, markers] of Object.entries(MARKERS)) {
    let score = 0;
    for (const marker of markers) {
      if (lower.includes(marker)) {
        // Marcadores mais longos são mais discriminativos.
        score += marker.length >= 4 ? 2 : 1;
      }
    }
    scores[lang] = score;
  }

  let best = 'en';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      best = lang;
      bestScore = score;
    }
  }
  // Sem nenhum marcador reconhecido, assume inglês como padrão neutro.
  return bestScore === 0 ? 'en' : best;
}

export function languageName(code) {
  return NAMES[code] || code;
}
