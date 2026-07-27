// Configuração central lida a partir de variáveis de ambiente.
// A ausência de credenciais coloca o app em "modo demo", que roda online
// sem nenhuma integração real usando dados de exemplo.

const env = process.env;

export const config = {
  port: Number(env.PORT) || 3000,
  dashboardToken: env.DASHBOARD_TOKEN || null,

  meta: {
    accessToken: env.META_PAGE_ACCESS_TOKEN || null,
    pageId: env.META_PAGE_ID || null,
    igUserId: env.META_IG_USER_ID || null,
    apiVersion: env.META_API_VERSION || 'v19.0',
  },

  tiktok: {
    accessToken: env.TIKTOK_ACCESS_TOKEN || null,
  },

  activecampaign: {
    baseUrl: (env.ACTIVECAMPAIGN_BASE_URL || '').replace(/\/+$/, '') || null,
    apiToken: env.ACTIVECAMPAIGN_API_TOKEN || null,
    listName: env.ACTIVECAMPAIGN_LIST_NAME || 'Meta Ads',
    dealOwner: env.ACTIVECAMPAIGN_DEAL_OWNER || 'Oner',
  },
};

// Cada integração é considerada "live" apenas quando tem credenciais completas.
export const integrationStatus = {
  meta: Boolean(config.meta.accessToken && config.meta.pageId),
  tiktok: Boolean(config.tiktok.accessToken),
  activecampaign: Boolean(
    config.activecampaign.baseUrl && config.activecampaign.apiToken,
  ),
};

// Modo geral: "live" se qualquer integração de mensagens estiver configurada.
export const isDemoMode = !integrationStatus.meta && !integrationStatus.tiktok;

export function publicStatus() {
  return {
    mode: isDemoMode ? 'demo' : 'live',
    integrations: {
      instagram: integrationStatus.meta,
      facebook: integrationStatus.meta,
      tiktok: integrationStatus.tiktok,
      activecampaign: integrationStatus.activecampaign,
    },
  };
}
