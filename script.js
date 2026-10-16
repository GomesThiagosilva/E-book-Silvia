(() => {
  "use strict";
  const config = window.SITE_CONFIG || {};
  const form = document.getElementById("lead-form");
  const submitButton = document.getElementById("submit-button");
  const buttonLabel = submitButton.querySelector(".button-label");
  const statusBox = document.getElementById("form-status");
  const successPanel = document.getElementById("success-panel");
  const successCopy = document.getElementById("success-copy");
  const downloadLink = document.getElementById("download-link");
  const emailStatus = document.getElementById("email-status");
  const whatsappLink = document.getElementById("whatsapp-link");
  const whatsappExplain = document.getElementById("whatsapp-explain");
  const phoneInput = document.getElementById("phone");
  const fields = {
    fullName: document.getElementById("fullName"),
    email: document.getElementById("email"),
    phone: phoneInput,
    consent: document.getElementById("consent")
  };
  let submitting = false;
  let emailjsInitialized = false;

  const setStatus = (message, kind = "") => {
    statusBox.textContent = message;
    statusBox.className = `form-status ${kind}`.trim();
  };
  const setFieldError = (key, message) => {
    const input = fields[key];
    const error = document.getElementById(`${key === "fullName" ? "name" : key}-error`);
    if (input && key !== "consent") input.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message || "";
  };
  const digits = value => value.replace(/\D/g, "");
  const formatPhone = value => {
    let d = digits(value).slice(0, 11);
    if (d.length > 10) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 0) return `(${d}`;
    return "";
  };
  phoneInput.addEventListener("input", () => {
    const start = phoneInput.selectionStart;
    phoneInput.value = formatPhone(phoneInput.value);
    // A simple mask; moving the caret to the end avoids jumping between punctuation.
    try { phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length); } catch (_) {}
    if (start === 0) phoneInput.setSelectionRange(0, 0);
    setFieldError("phone", "");
  });

  function validate() {
    let valid = true;
    const name = fields.fullName.value.trim().replace(/\s+/g, " ");
    const email = fields.email.value.trim();
    const phone = digits(fields.phone.value);
    setFieldError("fullName", "");
    setFieldError("email", "");
    setFieldError("phone", "");
    setFieldError("consent", "");

    if (name.length < 3 || name.split(" ").filter(Boolean).length < 2) {
      setFieldError("fullName", "Informe seu nome e sobrenome.");
      valid = false;
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setFieldError("email", "Digite um e-mail válido.");
      valid = false;
    }
    if (phone.length !== 10 && phone.length !== 11) {
      setFieldError("phone", "Informe um telefone com DDD (10 ou 11 dígitos).");
      valid = false;
    } else if (/^(\d)\1+$/.test(phone)) {
      setFieldError("phone", "Confira o número de telefone informado.");
      valid = false;
    }
    if (!fields.consent.checked) {
      setFieldError("consent", "É necessário concordar com o aviso de privacidade para continuar.");
      valid = false;
    }
    return valid ? { name, email, phone } : null;
  }

  function setLoading(loading) {
    submitting = loading;
    submitButton.disabled = loading;
    submitButton.classList.toggle("is-loading", loading);
    buttonLabel.textContent = loading ? "Processando cadastro..." : "Quero receber meu e-book";
  }

  async function saveLead(lead) {
    if (config.demoMode) {
      // Modo de teste intencionalmente não transmite nem persiste dados pessoais.
      await new Promise(resolve => setTimeout(resolve, 550));
      return { mode: "demo" };
    }
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("O Supabase não está configurado. Preencha a URL e a chave pública em config.js ou ative demoMode para testar.");
    }
    const baseUrl = config.supabaseUrl.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const endpoint = `${baseUrl}/rest/v1/${encodeURIComponent(config.supabaseTable || "leads")}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": config.supabaseAnonKey,
        "Authorization": `Bearer ${config.supabaseAnonKey}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        full_name: lead.name,
        email: lead.email,
        phone: lead.phone,
        consent: true,
        consented_at: new Date().toISOString(),
        source: window.location.hostname
      })
    });
    if (!response.ok) {
      let detail = "";
      try { detail = (await response.json()).message || ""; } catch (_) {}
      throw new Error(detail || `Não foi possível registrar o cadastro (HTTP ${response.status}).`);
    }
    return { mode: "live" };
  }

  async function sendConfirmationEmail(lead) {
    const ready = config.emailjsPublicKey && config.emailjsServiceId && config.emailjsTemplateId;
    if (!ready) return { sent: false, reason: "E-mail não configurado." };
    if (!window.emailjs) return { sent: false, reason: "A biblioteca EmailJS não carregou." };
    try {
      if (!emailjsInitialized) {
        window.emailjs.init({ publicKey: config.emailjsPublicKey });
        emailjsInitialized = true;
      }
      await window.emailjs.send(config.emailjsServiceId, config.emailjsTemplateId, {
        to_name: lead.name,
        to_email: lead.email,
        user_email: lead.email,
        subject: "Seu cadastro foi concluído!",
        message: `Olá, ${lead.name}!\n\nSeu cadastro foi concluído com sucesso. Seu e-book já está disponível para download na página.\n\nObrigado pelo seu interesse!`
      });
      return { sent: true };
    } catch (error) {
      console.error("Falha no EmailJS:", error);
      return { sent: false, reason: "Não foi possível enviar o e-mail agora." };
    }
  }

  function configureWhatsApp(lead) {
    const number = String(config.whatsappBusinessNumber || "").replace(/\D/g, "");
    if (number.length < 10) {
      whatsappLink.hidden = true;
      whatsappExplain.textContent = "Para habilitar o link, configure o número comercial em config.js. Nenhuma mensagem foi enviada automaticamente.";
      return;
    }
    const message = `Olá! Acabei de me cadastrar para receber o e-book. Meu nome é ${lead.name} e este é meu telefone: ${lead.phone}.`;
    whatsappLink.href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    whatsappLink.hidden = false;
    whatsappExplain.textContent = "Ao tocar, o WhatsApp abrirá uma conversa com a equipe e a mensagem ficará pronta. Você precisa enviá-la manualmente; o site não envia mensagens em seu nome.";
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    const lead = validate();
    if (!lead) {
      setStatus("Revise os campos destacados antes de continuar.", "error");
      const firstInvalid = form.querySelector('[aria-invalid="true"]') || (!fields.consent.checked ? fields.consent : null);
      firstInvalid?.focus();
      return;
    }
    // Honeypot não visível pode ser adicionado futuramente; validação no browser não substitui antispam no servidor.
    setLoading(true);
    setStatus("Registrando seu cadastro...", "info");
    try {
      const saved = await saveLead(lead);
      // Só mostramos o botão de download após a gravação (ou simulação explícita em demoMode).
      downloadLink.href = config.ebookPath || "assets/ebook.pdf";
      successCopy.textContent = saved.mode === "demo"
        ? "Modo de demonstração: o cadastro foi simulado no navegador e não foi salvo em banco. O botão de PDF está liberado para testar o fluxo."
        : "Seu cadastro foi registrado com sucesso. Seu e-book está pronto para baixar.";
      form.hidden = true;
      successPanel.hidden = false;
      setStatus("");
      configureWhatsApp(lead);
      emailStatus.textContent = "Preparando confirmação por e-mail...";
      const emailResult = await sendConfirmationEmail(lead);
      emailStatus.textContent = emailResult.sent
        ? "Confirmação enviada por e-mail."
        : emailResult.reason + (saved.mode === "demo" ? " (No modo de demonstração, isso é esperado.)" : " O download continua disponível.");
      successPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      console.error("Falha ao registrar lead:", error);
      setStatus(error.message || "Ocorreu uma falha de conexão. Tente novamente.", "error");
    } finally {
      setLoading(false);
    }
  });

  document.getElementById("new-registration").addEventListener("click", () => {
    successPanel.hidden = true;
    form.hidden = false;
    form.reset();
    setStatus("");
    Object.keys(fields).forEach(key => setFieldError(key, ""));
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  const dialog = document.getElementById("privacy-dialog");
  const openDialog = () => typeof dialog.showModal === "function" ? dialog.showModal() : alert("Leia a Política de Privacidade no conteúdo da página antes de continuar.");
  document.getElementById("privacy-open").addEventListener("click", openDialog);
  document.getElementById("privacy-open-footer").addEventListener("click", openDialog);
  document.getElementById("privacy-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  // Ajusta o caminho de download exibido no HTML para manter uma única fonte de configuração.
  downloadLink.href = config.ebookPath || "assets/ebook.pdf";
})();
