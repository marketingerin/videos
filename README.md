# Social Media Inbox Manager

Painel **online** para gerenciar mensagens não respondidas no **Instagram, Facebook e TikTok** (directs e comentários), sugerir respostas contextualizadas no idioma de cada mensagem e integrar leads ao **ActiveCampaign**.

É a versão web/hospedável do fluxo descrito na skill `social-media-inbox-manager`: enquanto a skill só roda dentro de uma sessão do Claude, este app é um serviço HTTP que **roda online por conta própria**.

---

## ✨ O que ele faz

1. **Busca** mensagens não respondidas (directs + comentários) nas três plataformas.
2. **Classifica** cada mensagem: pergunta de preço, dúvida geral, interesse em se inscrever, elogio, reclamação ou spam.
3. **Rascunha** uma resposta no idioma detectado (PT, EN, ES, FR, IT…) — exceto para preços e spam.
4. **Apresenta** tudo num painel com ações **Aprovar e Enviar / Ignorar**.
5. Após aprovação, **envia** a resposta e **processa o lead** no ActiveCampaign.

### Regras invioláveis (garantidas no servidor)

- 🚫 Nunca envia resposta sem aprovação explícita.
- 🚫 Nunca sugere resposta para perguntas de **preço** — vão para fila de aprovação manual.
- 🚫 Nunca responde **spam** (só permite ignorar).
- ✅ Sempre responde no **idioma** da mensagem.
- ✅ Sempre registra a mensagem original no ActiveCampaign (contatos não-spam).

---

## 🚀 Começando (modo demo, sem credenciais)

```bash
npm install
npm start
# abra http://localhost:3000
```

Sem nenhuma variável de ambiente, o app roda em **MODO DEMO** com mensagens de
exemplo nas três plataformas — pronto para demonstrar online imediatamente.
Envios e ações de CRM são **simulados** neste modo.

### Testes

```bash
npm test
```

---

## 🔌 Modo LIVE (integrações reais)

Copie `.env.example` para `.env` e preencha as credenciais. Cada integração
liga sozinha quando suas credenciais estão presentes:

| Integração | Variáveis | Habilita |
|---|---|---|
| Instagram + Facebook | `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` | Buscar/responder directs e comentários via Meta Graph API |
| TikTok | `TIKTOK_ACCESS_TOKEN` | Buscar/responder DMs e comentários |
| ActiveCampaign | `ACTIVECAMPAIGN_BASE_URL`, `ACTIVECAMPAIGN_API_TOKEN` | Criar contatos, notas em deals, reativar Lost |
| Lista de leads | `ACTIVECAMPAIGN_LIST_NAME` (padrão `Meta Ads`) | Lista onde novos leads entram |
| Owner de deals | `ACTIVECAMPAIGN_DEAL_OWNER` (padrão `Oner`) | Owner cujos deals recebem notas |
| Proteção do painel | `DASHBOARD_TOKEN` | Exige token para acessar a API |

> As integrações que **não** tiverem credenciais continuam em modo demo/simulado,
> então você pode ativar uma de cada vez.

### Lógica do ActiveCampaign

- **Contato novo** → cria contato, preenche `ORIGEM_LEAD` / `PAIS_ORIGEM` / `MENSAGEM_ORIGINAL` e adiciona à lista configurada.
- **Contato existente** → adiciona nota ao deal do owner configurado.
- **Deal com status Lost** → reativa (Lost → Open), adiciona nota e reinscreve o contato na lista.

---

## ☁️ Deploy online

> ⚠️ Um repositório/PR no GitHub é **só o código** — não é um site no ar.
> Para ter um endereço `https://...` que abre no navegador, é preciso
> **publicar (deploy)** o app em um serviço de hospedagem. Abaixo, o caminho
> mais rápido.

### Publicar em ~2 minutos (Render — grátis)

1. Faça o merge desta branch (ou aponte o Render para ela).
2. Em <https://dashboard.render.com> → **New** → **Blueprint**.
3. Selecione o repositório `marketingerin/videos`. O Render lê o `render.yaml`
   e cria o serviço web sozinho.
4. Clique **Apply**. Em ~2 min você recebe uma URL pública. Já funciona em
   **modo demo**; preencha as credenciais depois em **Environment** para ativar
   as integrações reais.

O app escuta em `0.0.0.0` na porta `PORT` (definida automaticamente pela
maioria das plataformas) e expõe `GET /health` para monitoramento.

### Docker

```bash
docker build -t inbox-manager .
docker run -p 3000:3000 --env-file .env inbox-manager
```

### Render / Railway / Fly.io / Heroku

- **Build:** `npm install`
- **Start:** `npm start`
- Defina as variáveis de ambiente no painel da plataforma.
- Health check: `/health`.

Nenhuma dependência de banco de dados — o estado do inbox vive em memória
durante a execução (recarregado a cada `Atualizar`).

---

## 📡 API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status do serviço + integrações (aberto) |
| `GET` | `/api/status` | Modo, integrações e resumo |
| `GET` | `/api/messages` | Lista mensagens (sincroniza se vazio; `?sync=1` força) |
| `POST` | `/api/sync` | Re-busca mensagens nas plataformas |
| `POST` | `/api/messages/:id/approve` | Corpo `{ "text": "..." }` — envia + CRM |
| `POST` | `/api/messages/:id/edit` | Corpo `{ "text": "..." }` — edita rascunho |
| `POST` | `/api/messages/:id/ignore` | Marca como ignorada |

Se `DASHBOARD_TOKEN` estiver definido, envie o header `x-inbox-token` (ou
`?token=` na URL do painel).

---

## 🗂️ Estrutura

```
server.js               Servidor Express (API + painel estático)
src/
  config.js             Leitura de env e detecção de modo demo/live
  classifier.js         Classificação de mensagens (preço vence sempre)
  language.js           Detecção de idioma
  replyGenerator.js     Rascunhos por categoria e idioma
  leadExtractor.js      Extração de email/telefone/país
  store.js              Estado em memória do inbox
  inboxService.js       Orquestra busca / envio / CRM
  demoData.js           Mensagens de exemplo (modo demo)
  integrations/
    meta.js             Instagram + Facebook (Graph API)
    tiktok.js           TikTok API for Business
    activecampaign.js   ActiveCampaign (API v3)
public/                 Painel (HTML/CSS/JS sem build)
test/                   Testes unitários das regras
```

---

## 📄 Licença

MIT
