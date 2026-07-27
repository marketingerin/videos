// Gera respostas sugeridas por categoria e idioma.
// REGRA INVIOLÁVEL: nunca gera resposta para price_inquiry nem spam.

const TEMPLATES = {
  general_question: {
    pt: 'Olá, {name}! Obrigado pela sua mensagem. 😊 Ficaremos felizes em ajudar — pode nos contar um pouco mais sobre o que você procura?',
    en: 'Hi {name}! Thanks for reaching out. 😊 We\'d be happy to help — could you tell us a bit more about what you\'re looking for?',
    es: '¡Hola, {name}! Gracias por escribirnos. 😊 Estaremos encantados de ayudarte, ¿podrías contarnos un poco más sobre lo que buscas?',
    fr: 'Bonjour {name} ! Merci pour votre message. 😊 Nous serons ravis de vous aider — pouvez-vous nous en dire un peu plus sur ce que vous recherchez ?',
    it: 'Ciao {name}! Grazie per il tuo messaggio. 😊 Saremo felici di aiutarti — puoi dirci qualcosa in più su ciò che cerchi?',
  },
  registration_interest: {
    pt: 'Que ótimo ter você com a gente, {name}! 🎉 Para reservar sua vaga, me confirma seu nome completo e o melhor e-mail? Assim já garantimos tudo pra você.',
    en: 'So glad you\'re interested, {name}! 🎉 To reserve your spot, could you confirm your full name and best email? We\'ll take care of the rest.',
    es: '¡Qué alegría tenerte con nosotros, {name}! 🎉 Para reservar tu lugar, ¿me confirmas tu nombre completo y tu mejor correo? Nos encargamos del resto.',
    fr: 'Ravis de votre intérêt, {name} ! 🎉 Pour réserver votre place, pouvez-vous confirmer votre nom complet et votre meilleur e-mail ? Nous nous occupons du reste.',
    it: 'Siamo felici del tuo interesse, {name}! 🎉 Per riservare il tuo posto, puoi confermarmi nome completo e la tua email migliore? Pensiamo a tutto noi.',
  },
  testimonial_or_praise: {
    pt: 'Muito obrigado pelo carinho, {name}! 🙏 Fica ainda mais especial saber que fez a diferença pra você. Conte sempre com a gente!',
    en: 'Thank you so much for the kind words, {name}! 🙏 It means a lot to know it made a difference for you. We\'re always here for you!',
    es: '¡Muchas gracias por tus palabras, {name}! 🙏 Nos alegra enormemente saber que marcó la diferencia para ti. ¡Cuenta siempre con nosotros!',
    fr: 'Merci beaucoup pour vos mots, {name} ! 🙏 Cela nous touche de savoir que cela a fait une différence pour vous. Nous sommes toujours là pour vous !',
    it: 'Grazie di cuore per le tue parole, {name}! 🙏 Ci fa piacere sapere che ha fatto la differenza per te. Conta sempre su di noi!',
  },
  complaint: {
    pt: 'Sinto muito pelo ocorrido, {name}. 💙 Queremos resolver isso o quanto antes — pode nos dar mais detalhes? Nossa equipe vai cuidar disso com prioridade.',
    en: 'I\'m truly sorry about this, {name}. 💙 We want to make it right as soon as possible — could you share more details? Our team will handle it as a priority.',
    es: 'Lamento mucho lo ocurrido, {name}. 💙 Queremos resolverlo cuanto antes, ¿podrías darnos más detalles? Nuestro equipo lo atenderá con prioridad.',
    fr: 'Je suis vraiment désolé pour cela, {name}. 💙 Nous voulons y remédier au plus vite — pouvez-vous nous donner plus de détails ? Notre équipe s\'en occupera en priorité.',
    it: 'Mi dispiace molto per l\'accaduto, {name}. 💙 Vogliamo risolverlo il prima possibile — puoi darci più dettagli? Il nostro team se ne occuperà con priorità.',
  },
};

function pickName(name) {
  if (!name) return '';
  // Usa apenas o primeiro nome para soar natural.
  return String(name).trim().split(/\s+/)[0];
}

// Retorna { text, generated } — generated=false quando a categoria exige
// tratamento manual (preço) ou quando não há template (spam).
export function generateReply(category, language, senderName) {
  if (!category || !category.suggestReply) {
    return { text: '', generated: false };
  }
  const set = TEMPLATES[category.key];
  if (!set) return { text: '', generated: false };

  const lang = set[language] ? language : 'en';
  const name = pickName(senderName);
  let text = set[lang].replace(/\{name\}/g, name);
  // Limpa saudação quando não há nome ("Olá, !" -> "Olá!").
  text = text
    .replace(/,\s*!/g, '!')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s*\)/g, '')
    .trim();
  return { text, generated: true };
}
