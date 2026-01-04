# ⚽ Arena Sports

> Plataforma SaaS moderna para gestão inteligente de quadras e complexos esportivos.

![Badge em Desenvolvimento](http://img.shields.io/static/v1?label=STATUS&message=EM%20DESENVOLVIMENTO&color=GREEN&style=for-the-badge)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)

> Preferência do projeto: use Bun para desenvolvimento e build (ex.: `bun dev`, `bun run build`).

## 💻 Sobre o Projeto

O **Arena Sports** é uma solução B2B/B2C desenvolvida para resolver a dor de cabeça no agendamento de quadras esportivas. O sistema elimina o uso de planilhas e conversas demoradas no WhatsApp, oferecendo:

1.  **Para o Dono (Admin):** Um painel de controle completo para gerenciar horários e visualizar a ocupação.
2.  **Para o Jogador (Cliente Final):** Um link público e rápido para verificar disponibilidade e realizar agendamentos.

## 🎨 Layout

<div align="center">
	<img src="https://via.placeholder.com/800x400?text=Print+do+Dashboard+Admin" alt="Dashboard Admin" width="700">
</div>

## 🏠 Landing Page

Uma **nova landing page** foi adicionada ao projeto e está disponível na rota raiz (`/`). A página inclui mockups para **iPhone** e **MacBook**, seções de demonstração (calendário, dashboard) e animações sutis. O arquivo principal da landing é `src/pages/Landing.tsx` e a página é carregada de forma lazy no `App`.

**Como testar localmente com Bun:**

```bash
bun install
bun dev
# Abra a URL que o Vite imprimir (ex.: http://localhost:5173 ou a porta informada no console)
```

A build de produção também foi verificada usando Bun (`bun run build`) e completou com sucesso. Se o servidor de desenvolvimento usar outra porta, utilize a URL exibida pelo Vite no terminal.

## 🛠 Tecnologias Utilizadas

O projeto foi construído com foco em **performance** e **DX (Developer Experience)**, utilizando o que há de mais moderno no ecossistema JavaScript:

- **[React 19](https://react.dev/):** Biblioteca principal para construção da interface.
- **[Vite](https://vitejs.dev/):** Build tool de próxima geração (extremamente rápido).
- **[Bun](https://bun.sh/):** Runtime e gerenciador de pacotes (substituindo o Node.js para maior velocidade).
- **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática para maior segurança e escalabilidade.
- **[Tailwind CSS](https://tailwindcss.com/) & [Shadcn/UI](https://ui.shadcn.com/):** Para estilização moderna, responsiva e acessível.
- **React Router DOM:** Gerenciamento de rotas e navegação SPA.
- **React Helmet Async:** Otimização de SEO e metadados.

## 🚀 Como Rodar o Projeto

### Pré-requisitos

Você precisa ter o **[Bun](https://bun.sh/)** instalado em sua máquina.

### Instalação & execução (Bun)

```bash
# Clone este repositório
$ git clone https://github.com/RafalauriSantos/arena-sports.git

# Vá para a pasta do projeto
$ cd arena-sports

# Instale dependências (Bun é recomendado)
$ bun install

# Configure variáveis de ambiente
# - Copie .env.example -> .env.local
# - Preencha pelo menos VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Desenvolvimento (HMR) — testes rápidos e debug
$ bun run dev
# Abra a URL que o Vite imprimir no terminal (ex.: http://localhost:5173)

# Build de produção — gera a pasta `dist`
$ bun run build

# Preview da build de produção (serve a pasta `dist` localmente)
$ bun run preview
# Abra a URL que o Vite/preview imprimir no terminal (ex.: http://localhost:4173)
```

### 🔐 Variáveis de ambiente (Supabase)

O frontend usa variáveis do Vite (prefixo `VITE_`). O mínimo para rodar localmente é:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Importante:

- A `SUPABASE_SERVICE_ROLE_KEY` **não pode** ir para o browser (não use `VITE_`).
- Se suas Edge Functions precisam dela, configure como secret no Supabase (ou no seu servidor).
- Se você compartilhou a service role key em algum lugar, trate como vazamento e **rotacione** a chave no painel do Supabase.

Dica: use `bun run dev` para interatividade rápida com hot reload; para testar o comportamento de produção, rode `bun run build` e `bun run preview`.

## 💳 Billing (Stripe)

O billing roda via **Stripe Checkout (assinatura)** + **Stripe Webhooks** + **Supabase Edge Functions**.

### Variáveis do Frontend (`.env.local`)

Além das variáveis do Supabase, o app usa IDs de preços do Stripe (para exibir/selecionar plano):

- `VITE_STRIPE_PRICE_START_MONTHLY`
- `VITE_STRIPE_PRICE_START_YEARLY`
- `VITE_STRIPE_PRICE_PRO_MONTHLY`
- `VITE_STRIPE_PRICE_PRO_YEARLY`

Importante:

- Esses IDs **não são segredo** (podem ficar no browser). Segredos do Stripe ficam apenas nas Edge Functions.

### Secrets das Edge Functions (Supabase)

Configure como secrets no Supabase (Dashboard → Edge Functions → Secrets, ou via CLI):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (segredo)
- `STRIPE_SECRET_KEY` (segredo)
- `STRIPE_WEBHOOK_SECRET` (segredo; usado no webhook)

IDs de preços para inferência no backend (aceita duas grafias por compatibilidade):

- `STRIPE_PRICE_START_MONTH` ou `STRIPE_PRICE_START_MONTHLY`
- `STRIPE_PRICE_START_YEAR` ou `STRIPE_PRICE_START_YEARLY`
- `STRIPE_PRICE_PRO_MONTH` ou `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEAR` ou `STRIPE_PRICE_PRO_YEARLY`

### Edge Functions usadas

- `stripe-create-checkout`: cria sessão do Stripe Checkout.
- `stripe-sync-checkout`: sincroniza a assinatura ao voltar do Checkout (fallback contra atraso de webhook).
- `stripe-webhook`: recebe eventos do Stripe e atualiza `tenant_subscriptions`.
- `stripe-create-portal-session`: abre o Billing Portal (gerenciar assinatura).
- `ensure-tenant-subscription`: garante que existe linha em `tenant_subscriptions` (e que trial só começa após consentimento).

Obs.: no [supabase/config.toml](supabase/config.toml) estas funções estão com `verify_jwt = false` (o webhook precisa disso). As funções acionadas pelo app validam o usuário/tenant na própria lógica.

### Setup rápido (produção)

1. Aplicar migrations no Supabase remoto:

```bash
npx supabase@latest db push
```

2. Configurar secrets (exemplo via CLI — não cole segredos em histórico público):

```bash
npx supabase@latest secrets set \
	SUPABASE_URL=... \
	SUPABASE_ANON_KEY=... \
	SUPABASE_SERVICE_ROLE_KEY=... \
	STRIPE_SECRET_KEY=... \
	STRIPE_WEBHOOK_SECRET=... \
	STRIPE_PRICE_START_MONTHLY=... \
	STRIPE_PRICE_PRO_MONTHLY=...
```

3. Deploy das funções (se necessário no seu fluxo):

```bash
npx supabase@latest functions deploy stripe-webhook
npx supabase@latest functions deploy stripe-create-checkout
npx supabase@latest functions deploy stripe-sync-checkout
npx supabase@latest functions deploy stripe-create-portal-session
npx supabase@latest functions deploy ensure-tenant-subscription
```

4. Configurar webhook no Stripe:

- Endpoint: `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`
- Eventos esperados: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### Validação (o que precisa acontecer)

- Selecionar **Pro** (recomendado) ou **Start** no app → ir pro Checkout
- Pagar → voltar para o app → status vira **Ativo** e mostra plano/valor corretos (ex.: **Pro R$169**)
- Usuário pago **não** vê CTA de trial/assinar
- Portal abre em Configurações (gerenciar assinatura)

### Troubleshooting

- Se pagou e não atualizou na hora: o app chama `stripe-sync-checkout` no retorno usando `session_id`. Verifique se o `session_id` está presente na URL e se a função responde 200.
- Se webhook estiver falhando: confira `STRIPE_WEBHOOK_SECRET` e os logs da função `stripe-webhook`.

## ⚙️ Funcionalidades Atuais (MVP)

- [x] Login Administrativo: Acesso seguro para proprietários.
- [x] Dashboard: Visão geral do sistema.
- [x] Agenda Pública: Link compartilhável (/agendar) para jogadores visualizarem horários.
- [x] Roteamento Inteligente: Redirecionamentos automáticos baseados no perfil de acesso.
- [x] SEO Otimizado: Metatags dinâmicas para compartilhamento em redes sociais.

## 🔜 Próximos Passos (Roadmap)

- [x] Integração com Gateway de Pagamento (Stripe).
- [ ] Notificações via WhatsApp para confirmação de jogos.
- [ ] Implementação de IA (Python) para análise preditiva de horários de pico.

## 📝 Licença

Este projeto está sob a licença MIT.

Desenvolvido por Rafael Lauri 🚀
