/*
 * CONFIGURAÇÃO DO SITE
 * Este arquivo é público. Só coloque aqui identificadores/chaves públicas
 * próprios para uso no navegador. Nunca coloque service_role, senhas ou chaves privadas.
 */
window.SITE_CONFIG = {
  // true = modo de demonstração: simula o cadastro no navegador (não grava em banco).
  // false = exige Supabase configurado e grava os cadastros via API.
  demoMode: false,

  // PDF relativo à raiz do site. Substitua assets/ebook.pdf pelo seu arquivo definitivo.
  ebookPath: "assets/ebook.pdf",

  // Supabase > Project Settings > API. A anon/publishable key é pública por definição;
  // proteja os dados com RLS. NUNCA use a service_role key no frontend.
  supabaseUrl: "https://levzppfsohjkdntvheev.supabase.co/rest/v1/",
  supabaseAnonKey: "sb_publishable_jXaoxGkSibwMmcb0_aeFsQ_3DzkNLTj",
  supabaseTable: "leads",

  // EmailJS > Account / Email Services / Email Templates.
  emailjsPublicKey: "",
  emailjsServiceId: "",
  emailjsTemplateId: "",

  // Número do WhatsApp da organização em formato internacional, só dígitos (ex.: 5511999999999).
  // No modo link, o visitante abre a conversa com a organização e envia a mensagem manualmente.
  whatsappBusinessNumber: "",

  // Opcional: URL do endpoint de uma solução antispam/serverless validada no servidor.
  // Não é implementado automaticamente; não preencha com segredo no cliente.
  honeypotEnabled: true
};
