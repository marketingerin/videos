// Social Media Inbox Manager — servidor HTTP.
// Serve o painel (public/) e uma API REST para gerenciar o inbox.
// Roda online sem configuração (modo demo) e usa integrações reais quando
// as credenciais estão presentes no ambiente.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config, publicStatus, isDemoMode } from './src/config.js';
import { store } from './src/store.js';
import {
  syncMessages,
  approveAndSend,
  editReply,
  ignore,
  summary,
} from './src/inboxService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: '256kb' }));
app.disable('x-powered-by');

// ── Autenticação opcional do painel ──
function auth(req, res, next) {
  if (!config.dashboardToken) return next();
  const token = req.get('x-inbox-token') || req.query.token;
  if (token && token === config.dashboardToken) return next();
  return res.status(401).json({ error: 'Não autorizado. Token inválido ou ausente.' });
}

// Health check — sempre aberto, útil para monitoramento de uptime online.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', ...publicStatus(), summary: summary() });
});

// ── API ──
const api = express.Router();
api.use(auth);

api.get('/status', (_req, res) => {
  res.json({ ...publicStatus(), summary: summary() });
});

api.get('/messages', async (req, res) => {
  try {
    if (store.list().length === 0 || req.query.sync === '1') {
      await syncMessages();
    }
    res.json({ ...publicStatus(), summary: summary(), messages: store.list() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/sync', async (_req, res) => {
  try {
    await syncMessages();
    res.json({ ...publicStatus(), summary: summary(), messages: store.list() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

api.post('/messages/:id/approve', async (req, res) => {
  const result = await approveAndSend(req.params.id, req.body?.text);
  res.status(result.ok ? 200 : 400).json(result);
});

api.post('/messages/:id/edit', (req, res) => {
  const result = editReply(req.params.id, req.body?.text);
  res.status(result.ok ? 200 : 400).json(result);
});

api.post('/messages/:id/ignore', (req, res) => {
  const result = ignore(req.params.id);
  res.status(result.ok ? 200 : 400).json(result);
});

app.use('/api', api);

// ── Painel estático ──
app.use(express.static(path.join(__dirname, 'public')));

// Fallback para a SPA.
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(
    `Social Media Inbox Manager rodando em http://0.0.0.0:${config.port} ` +
      `(modo: ${isDemoMode ? 'DEMO' : 'LIVE'})`,
  );
});

export { app, server };
