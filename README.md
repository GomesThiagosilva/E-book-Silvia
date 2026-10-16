# Landing page de captura de leads para e-book

Landing page estática em HTML5, CSS3 e JavaScript puro. O projeto inclui validação de formulário, máscara brasileira de telefone, consentimento explícito, modal de privacidade, modo de demonstração, integração opcional com Supabase, integração opcional com EmailJS e link de WhatsApp com mensagem pré-preenchida.

> **Importante:** o modo inicial é de demonstração. Ele não envia nem salva dados pessoais em um banco. Antes de produção, configure e teste os serviços externos, substitua a política de privacidade de exemplo e revise as regras de acesso.

## Estrutura

```text
ebook-leads-site/
├── index.html
├── styles.css
├── script.js
├── config.js
├── README.md
└── assets/
    └── ebook-placeholder.pdf
```

O arquivo `assets/ebook-placeholder.pdf` é apenas um PDF de instrução. Substitua-o pelo e-book definitivo.

## 1. Testar localmente

1. Baixe/descompacte a pasta.
2. Abra `index.html` no navegador. Para uma experiência mais próxima da hospedagem, rode um servidor estático local, por exemplo a extensão **Live Server** do VS Code.
3. Mantenha `demoMode: true` em `config.js`.
4. Preencha nome e sobrenome, e-mail válido, telefone com DDD e marque a caixa de consentimento.
5. Envie. A página deve mostrar a confirmação e o botão de PDF sem recarregar.
6. O cadastro **não** será salvo e o e-mail **não** será enviado no modo de demonstração. Aponte o download para um PDF real para testar a abertura do arquivo.

## 2. Trocar o PDF

Coloque o arquivo definitivo em `assets/ebook.pdf` e deixe em `config.js`:

```js
ebookPath: "assets/ebook.pdf"
```

Ou altere `ebookPath` para outro caminho relativo publicado no mesmo site. Faça um teste de download depois de publicar.

**Limite importante:** em hospedagem estática, um PDF público pode ser compartilhado por qualquer pessoa que conheça seu endereço. O formulário só controla a exibição do botão na página; não protege o arquivo em si. Se o e-book precisa ser privado, use armazenamento privado com URLs assinadas de curta duração geradas por um backend/serverless seguro. Nunca inclua dados pessoais no PDF público.

## 3. Supabase para gravar os cadastros

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No SQL Editor, execute o SQL abaixo.
3. Em **Project Settings → API**, copie a Project URL e a chave pública `anon`/publishable para `config.js`.
4. Defina `demoMode: false`.
5. Não use a chave `service_role` no navegador. Ela ignora políticas de segurança e é secreta.

SQL inicial:

```sql
create table public.leads (
  id bigint generated always as identity primary key,
  full_name text not null check (char_length(full_name) between 3 and 120),
  email text not null check (char_length(email) <= 254),
  phone text not null check (phone ~ '^[0-9]{10,11}$'),
  consent boolean not null check (consent = true),
  consented_at timestamptz not null,
  source text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Visitantes podem inserir apenas pela política; não conceda SELECT público.
grant insert on table public.leads to anon;
grant usage, select on sequence public.leads_id_seq to anon;

create policy "public can submit consented leads"
on public.leads for insert to anon
with check (
  consent = true
  and char_length(full_name) between 3 and 120
  and char_length(email) <= 254
  and phone ~ '^[0-9]{10,11}$'
);
```

Configure `config.js`:

```js
demoMode: false,
supabaseUrl: "https://SEU-PROJETO.supabase.co",
supabaseAnonKey: "SUA_CHAVE_PUBLICA_ANON",
supabaseTable: "leads"
```

A chave pública do Supabase é feita para estar no cliente, mas **não é uma barreira de segurança**. A segurança vem de RLS, grants e políticas. Revise o SQL com atenção no seu projeto; nunca habilite `SELECT` para `anon`. Para uso real, recomendamos inserir por uma função serverless que valide os dados, aplique rate limit/CAPTCHA e controle duplicidade. Não há proteção antispam robusta só com JavaScript.

### Duplicidade, abuso e privacidade

- O botão impede envios simultâneos na mesma página, mas isso não impede bots ou repetição em outros navegadores.
- Para produção, adicione rate limiting, CAPTCHA/Turnstile validado no servidor e/ou Edge Function. Não confie em tokens validados apenas no cliente.
- Considere normalizar e-mails/telefones e criar regra de deduplicação, sem rejeitar pessoas legitimamente diferentes sem necessidade.
- Restrinja o painel do Supabase a administradores autorizados, habilite MFA e defina uma política de retenção/exclusão.
- Não crie políticas públicas de leitura para a tabela de leads.

## 4. EmailJS

A integração utiliza o SDK oficial do EmailJS carregado por CDN. É opcional: se não configurar os três campos, o cadastro continua e a página informa que o e-mail não foi enviado.

1. Crie uma conta em [EmailJS](https://www.emailjs.com/).
2. Adicione e valide um serviço de e-mail em **Email Services**.
3. Crie um template em **Email Templates**. Configure o destinatário usando `{{to_email}}` e o assunto usando `{{subject}}`. Corpo sugerido:

   ```text
   Olá, {{to_name}}!

   Seu cadastro foi concluído com sucesso. Seu e-book já está disponível para download na página.

   Obrigado pelo seu interesse!
   ```

4. Copie o **Service ID**, **Template ID** e **Public Key** para `config.js`:

   ```js
   emailjsPublicKey: "SUA_PUBLIC_KEY",
   emailjsServiceId: "SEU_SERVICE_ID",
   emailjsTemplateId: "SEU_TEMPLATE_ID"
   ```

A Public Key do EmailJS foi projetada para uso no navegador, mas não é uma senha. Configure limites/restrições disponíveis na conta, monitore uso e nunca coloque credenciais privadas. Uma página estática não consegue garantir entrega de e-mail. O envio ocorre depois de o cadastro ser registrado; se o e-mail falhar, o download continua liberado e a interface informa a falha.

## 5. WhatsApp: o que este projeto faz e não faz

O site **não envia automaticamente** uma mensagem para o telefone informado pelo visitante. Sem API oficial, isso não é possível de forma legítima e confiável a partir de uma página estática.

O modo incluído é um link `wa.me` para o **número comercial que você configurar**. Ele abre uma conversa com a equipe, com mensagem pré-preenchida para o próprio visitante enviar manualmente. Configure `whatsappBusinessNumber` em `config.js` com o número da organização em formato internacional, só dígitos (ex.: `5511999999999`). Esse fluxo não equivale a uma confirmação automática enviada ao visitante.

Para automatizar mensagens para o telefone do lead, será necessário um provedor/API oficial da **WhatsApp Business Platform**, com um backend ou função serverless para proteger tokens. Em geral, isso exige:
- conta comercial e número configurados, aprovação/verificação conforme os requisitos da Meta;
- consentimento específico e demonstrável para receber mensagens no WhatsApp;
- uso de modelos de mensagem aprovados quando a conversa é iniciada pela empresa fora da janela de atendimento permitida;
- gestão de opt-out, templates, falhas, segurança dos tokens e registros;
- verificação de preços atuais por conversa/mensagem e possíveis tarifas do provedor. Não presuma que automação é gratuita.

Não coloque tokens de acesso da Meta em `config.js` nem em JavaScript público.

## 6. LGPD e política de privacidade

O formulário exige uma caixa de consentimento desmarcada por padrão. O texto e o modal de política são um **modelo genérico**, não aconselhamento jurídico. Antes de publicar, identifique o controlador, informe contato válido, bases legais, finalidade, retenção, compartilhamentos com Supabase/EmailJS e procedimento para exercer direitos. Colete apenas o necessário e mantenha registro do consentimento.

Se quiser usar o telefone para marketing ou mensagens promocionais, avalie uma autorização separada, específica e opcional. Não reutilize o consentimento para entregar o material como autorização irrestrita para marketing.

## 7. Publicar grátis no GitHub Pages

1. Crie um repositório público no [GitHub](https://github.com/).
2. Envie os arquivos e a pasta `assets/` para a raiz do repositório.
3. Abra **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**, selecione `main` e `/ (root)` e salve.
5. Aguarde a URL publicada indicada na mesma tela. Confirme que `index.html`, CSS, JavaScript e PDF carregam.
6. Configure os serviços externos para aceitar a origem publicada, se necessário.

Alternativa: [Cloudflare Pages](https://pages.cloudflare.com/) permite conectar o repositório GitHub e publicar arquivos estáticos. Se usar uma função serverless/Edge Function para validação, antispam ou links assinados, configure-a separadamente e mantenha segredos somente nas variáveis de ambiente do servidor.

### Limitações de hospedagem gratuita

Hospedagem estática serve HTML/CSS/JS e arquivos públicos; ela não fornece, por si só, banco de dados privado, API de WhatsApp ou envio de e-mail garantido. Supabase, EmailJS e Cloudflare possuem planos e limites próprios que podem mudar. Verifique os limites atuais antes de produção. Automação oficial do WhatsApp pode gerar custos. Não há cobrança de hospedagem estática obrigatória neste projeto, mas serviços externos não são garantidamente ilimitados/gratuitos.

## 8. Checklist antes de produção

- [ ] Substituir PDF de placeholder e conferir `ebookPath`.
- [ ] Substituir nome/contato e revisar a política de privacidade.
- [ ] Configurar Supabase e validar RLS; definir `demoMode: false`.
- [ ] Testar que `anon` consegue inserir, mas não ler/listar cadastros.
- [ ] Configurar e testar EmailJS com um endereço real.
- [ ] Configurar o número comercial do WhatsApp e testar o link manual.
- [ ] Adicionar antispam validado no servidor/Edge Function e rate limiting.
- [ ] Testar celular, desktop, teclado, mensagens de erro e falhas de rede.
- [ ] Definir retenção, processo de exclusão e responsável por solicitações LGPD.
- [ ] Verificar que nenhum token secreto foi publicado no GitHub.

## Fluxo de teste recomendado

1. Com `demoMode: true`, teste dados inválidos, caixa de consentimento desmarcada e envio válido.
2. Confirme que a mensagem de sucesso e o botão de PDF aparecem apenas após o fluxo de demonstração.
3. Configure Supabase em projeto de teste, mude `demoMode` para `false` e faça um cadastro de teste.
4. Confira a linha no painel do Supabase como administrador e teste que a API pública não permite ler os registros.
5. Configure EmailJS e confirme o recebimento (verifique spam).
6. Clique no WhatsApp e confirme que abre a conversa comercial com o texto preenchido; envie manualmente se quiser.
7. Simule internet desligada/credenciais incorretas e confira a mensagem de erro. O download não deve ser liberado se o registro real falhar.

## Notas técnicas

- A validação de cliente melhora a experiência, mas não substitui validação e antispam no servidor.
- O formulário evita envios concorrentes no mesmo carregamento. Não implementa idempotência global.
- O PDF estático pode ser acessado diretamente. O bloqueio do botão não é controle de acesso.
- Não existe configuração de credenciais fornecida neste pacote; integrações ficam desativadas até você preencher os campos.
