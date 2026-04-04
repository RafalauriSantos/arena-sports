<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f766e,50:0d9488,100:10b981&height=96&section=header&text=ArenaSys&fontSize=44&fontColor=ffffff&animation=fadeIn&fontAlignY=34" alt="ArenaSys" />

### Plataforma SaaS para gestao de arenas esportivas

Agendamento online, operacao diaria e visao de negocio em um unico sistema.

[![Demo](https://img.shields.io/badge/Demo-arenasys.com.br-16a34a?style=for-the-badge)](https://arenasys.com.br)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://arenasys.com.br)
[![Stack](https://img.shields.io/badge/React%20%2B%20Vite%20%2B%20Supabase-0f766e?style=for-the-badge)](#stack)

</div>

## Visao Geral

ArenaSys e um SaaS multi-tenant para complexos esportivos. Cada arena possui ambiente isolado, agenda publica por link e painel administrativo para operacao e crescimento.

Principais fluxos:

- Onboarding da arena e configuracao inicial
- Agenda publica em `/agendar/:subdomain`
- Login admin, dashboard e operacao diaria
- Recuperacao de senha com tela dedicada

> [!TIP]
> Este README foi propositalmente reduzido para onboarding rapido. Conteudo detalhado esta em [docs/README_DOCS.md](docs/README_DOCS.md).

## Stack

- Frontend: React 18, TypeScript, Vite 7, Tailwind CSS
- UI e DX: Radix UI, Lucide, React Hook Form, Zod
- Dados: TanStack Query, Supabase (Auth, Realtime, Postgres)
- Runtime: Bun (recomendado), Node 18+ (suporte)
- Deploy: Vercel

## Setup Rapido

### 1) Requisitos

- Bun 1.3+
- Node.js 18+
- Conta Supabase com projeto ativo

### 2) Instalar e rodar

```bash
git clone https://github.com/RafalauriSantos/arena-sports.git
cd arena-sports
bun install
bun dev
```

### 3) Variaveis de ambiente

Crie `.env.local` na raiz:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> [!WARNING]
> Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend. Use apenas em ambientes/servicos seguros.

## Comandos Essenciais

```bash
# Desenvolvimento
bun dev

# Build local
bun run build

# Build para Vercel (injecao SEO)
bun run build:vercel

# Preview
bun run preview

# Lint
bun run lint

# Testes principais
bun run test
bun run test:flow
bun run test:tenant-isolation
```

## Deploy

- Producao: push na branch `main`
- Build command: definido em [vercel.json](vercel.json)
- Dominio principal: https://arenasys.com.br

Checklist curto de release:

- Testes essenciais passando
- Build sem erros
- Variaveis de ambiente configuradas
- Fluxos criticos validados (login, cadastro, reset de senha, agendamento)

## Estrutura Enxuta

```text
src/                # app React (pages, components, hooks)
supabase/           # migrations e configuracao backend
scripts/            # automacoes de teste, auditoria e operacao
docs/               # guias detalhados (SEO, performance, etc.)
```

## Documentacao Detalhada

- Indice geral: [docs/README_DOCS.md](docs/README_DOCS.md)
- Backlog local de evolucao: [MELHORIAS_PENDENTES.md](MELHORIAS_PENDENTES.md)

## Roadmap

As proximas melhorias priorizadas estao em [MELHORIAS_PENDENTES.md](MELHORIAS_PENDENTES.md), espelhadas do Notion e organizadas por fase.
