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

## � Guia de Desenvolvimento

### Pré-requisitos

- **Bun** (recomendado) ou Node.js 18+
- **Git**
- Conta no **Supabase**
- Conta no **Asaas** (para pagamentos)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/RafalauriSantos/arena-sys.git
cd arena-sys

# Instale as dependências
bun install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env.local

# Configure as variáveis de ambiente (veja seção abaixo)
```

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Asaas (pagamentos)
ASAAS_API_KEY=your_asaas_api_key
ASAAS_WEBHOOK_SECRET=your_webhook_secret
```

### Desenvolvimento Local

```bash
# Iniciar servidor de desenvolvimento
bun dev

# Build para produção
bun run build

# Preview da build
bun run preview
```

### Testes

O projeto inclui scripts de teste automatizados:

```bash
# Teste completo da suite
bun run scripts/test-suite-complete.ts

# Teste de fluxo completo (cadastro → onboarding → billing)
bun run scripts/test-fluxo-completo.ts

# Testes individuais
bun run scripts/testAsaasCreateCheckout.ts
bun run scripts/testAsaasWebhook.ts
bun run scripts/testTenantIsolation.sql
```

### Banco de Dados

```bash
# Aplicar migrations
npx supabase@latest db push

# Reset do banco local (desenvolvimento)
npx supabase@latest db reset

# Ver status das migrations
npx supabase@latest migration list
```

## 🧪 Testes e Qualidade

### Testes Automatizados

Execute a suite completa de testes antes de fazer deploy:

```bash
# Teste de conectividade e isolamento
✅ Conectividade do Banco
✅ Sistema de Autenticação
✅ Isolamento Multi-Tenant
✅ Integração Asaas
✅ Performance Básica

# Teste de fluxo completo
✅ Cadastro → Onboarding → Checkout → Webhook
```

### Checklist de Produção

- [ ] Todos os testes passando
- [ ] Migrations aplicadas no banco remoto
- [ ] Secrets do Asaas configuradas
- [ ] Build de produção funcionando
- [ ] PWA testado em dispositivos móveis
- [ ] Isolamento de tenants validado

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório no Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push na main

### Configuração de Produção

```bash
# Build otimizado
bun run build

# Preview antes do deploy
bun run preview
```

### Pós-Deploy

1. **Configurar domínio personalizado** no Vercel
2. **Configurar webhooks do Asaas** apontando para produção
3. **Testar fluxo completo** em produção
4. **Monitorar logs** das Edge Functions

## 🚀 Como Rodar o Projeto

### Pré-requisitos

Você precisa ter o **[Bun](https://bun.sh/)** instalado em sua máquina.

### Instalação & execução (Bun)

```bash
# Clone este repositório
$ git clone https://github.com/RafalauriSantos/arena-sys.git

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

## 💳 Billing (Asaas)

O billing roda via **Asaas Subscriptions + Payments + Webhooks** + **Supabase Edge Functions**.

### Secrets das Edge Functions (Supabase)

Configure como secrets no Supabase (Dashboard → Edge Functions → Secrets, ou via CLI):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (segredo)
- `ASAAS_API_KEY` (segredo)
- `ASAAS_WEBHOOK_SECRET` (segredo; usado no webhook)
- `ASAAS_API_URL` (opcional; sandbox/prod)

### Edge Functions usadas

- `asaas-create-checkout`: cria assinatura e gera URL de pagamento.
- `asaas-webhook`: recebe eventos do Asaas e atualiza `tenant_subscriptions`.
- `asaas-manage-subscription`: cancelamento/reativação/troca de plano.
- `ensure-tenant-subscription`: garante linha em `tenant_subscriptions` (trial após consentimento).

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
	ASAAS_API_KEY=... \
	ASAAS_WEBHOOK_SECRET=... \
	ASAAS_API_URL=...
```

3. Deploy das funções (se necessário no seu fluxo):

```bash
npx supabase@latest functions deploy asaas-webhook
npx supabase@latest functions deploy asaas-create-checkout
npx supabase@latest functions deploy asaas-manage-subscription
npx supabase@latest functions deploy ensure-tenant-subscription
```

4. Configurar webhook no Asaas:

- **Endpoint:** `https://<PROJECT_REF>.functions.supabase.co/asaas-webhook`
- **Header obrigatório:** `asaas-access-token: <ASAAS_WEBHOOK_SECRET>`
- **Eventos:** `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `SUBSCRIPTION_CREATED`

> **Importante:** O webhook precisa estar configurado corretamente no Asaas para que os pagamentos atualizem automaticamente o status da assinatura.

### Validação (o que precisa acontecer)

- Selecionar **Pro** (recomendado) ou **Start** no app → ir pro Checkout
- Pagar → voltar para o app → status vira **Ativo** e mostra plano/valor corretos
- Usuário pago **não** vê CTA de trial/assinar

### Troubleshooting

- Se pagou e não atualizou: confira o webhook e os logs da função `asaas-webhook`.
- Se checkout falha: valide `ASAAS_API_KEY` e dados obrigatórios (CPF/CNPJ e telefone).

### ✅ Checklist final de testes (MPV)

- Variáveis de ambiente configuradas (Supabase + Asaas) no ambiente correto.
- Migrations aplicadas e RLS ativo nas tabelas críticas.
- Login, signup e onboarding criam `tenant_id` corretamente.
- Criar/editar/deletar reservas funciona no admin.
- Calendário público (`/agendar/:subdomain`) mostra ocupação correta.
- Trial inicia apenas após consentimento e bloqueio funciona após expirar.
- Checkout Asaas abre, pagamento aprova e status vira **active**.
- Webhook registra evento e atualiza `tenant_subscriptions`.
- Build e preview de produção executam sem erros.
- PWA testado em desktop e mobile (principal fluxo de reserva).

## ⚙️ Funcionalidades Atuais (MVP)

- [x] Login Administrativo: Acesso seguro para proprietários.
- [x] Dashboard: Visão geral do sistema.
- [x] Agenda Pública: Link compartilhável (/agendar) para jogadores visualizarem horários.
- [x] Roteamento Inteligente: Redirecionamentos automáticos baseados no perfil de acesso.
- [x] SEO Otimizado: Metatags dinâmicas para compartilhamento em redes sociais.

## 🔜 Próximos Passos (Roadmap)

- [x] Integração com Gateway de Pagamento (Asaas).
- [ ] Notificações via WhatsApp para confirmação de jogos.
- [ ] Implementação de IA (Python) para análise preditiva de horários de pico.

## 📝 Licença

Este projeto está sob a licença MIT.

Desenvolvido por Rafael Lauri 🚀
