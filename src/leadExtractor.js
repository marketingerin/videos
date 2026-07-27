// Extrai dados de lead (email, telefone) do texto da mensagem.
// Usado para popular o ActiveCampaign quando o cliente fornece contato.

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
// Telefones internacionais: opcional +, dígitos, espaços, hífens, parênteses.
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;

// Mapa simples idioma -> país provável (para PAIS_ORIGEM).
const LANG_COUNTRY = {
  pt: 'Brasil',
  es: 'Espanha',
  fr: 'França',
  it: 'Itália',
  en: 'Estados Unidos',
};

export function extractLead(text, language) {
  const emailMatch = (text || '').match(EMAIL_RE);
  const phoneMatch = (text || '').match(PHONE_RE);
  return {
    email: emailMatch ? emailMatch[0].toLowerCase() : null,
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, ' ').trim() : null,
    country: LANG_COUNTRY[language] || null,
  };
}
