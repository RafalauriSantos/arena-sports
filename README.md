<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f766e,50:0d9488,100:10b981&height=96&section=header&text=ArenaSys&fontSize=44&fontColor=ffffff&animation=fadeIn&fontAlignY=34" alt="ArenaSys" />

### SaaS privado para gestao de arenas esportivas

Reserva online, operacao administrativa e base multi-tenant para arenas, quadras society e beach tennis.

[![Demo](https://img.shields.io/badge/Demo-arenasys.com.br-16a34a?style=for-the-badge)](https://arenasys.com.br)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://arenasys.com.br)
[![Stack](https://img.shields.io/badge/React%20%2B%20TypeScript%20%2B%20Supabase-0f766e?style=for-the-badge)](#stack)

</div>

## Sobre

ArenaSys e um SaaS privado criado para ajudar donos de arenas esportivas a sair de uma operacao dependente de conversas soltas, planilhas e memoria da equipe.

O produto combina uma landing comercial, um link publico de reservas por arena e um painel administrativo para acompanhar agenda, clientes, horarios e status das reservas. A arquitetura foi pensada para suportar multiplas arenas dentro da mesma plataforma, mantendo dados e operacao separados por tenant.

> [!NOTE]
> Este repositorio apresenta uma amostra controlada do projeto. Detalhes internos de infraestrutura, chaves, operacao comercial e decisoes sensiveis ficam fora deste README.

## Estado Atual

O produto esta em desenvolvimento ativo e ja possui os fluxos principais de operacao:

- Landing page comercial com copy, SEO e fluxo de conversao.
- Link publico de reservas por arena em `/agendar/:subdomain`.
- Painel administrativo redesenhado com foco em operacao diaria.
- Sidebar com status de trial, progresso de configuracao e navegacao por grupos.
- Tema claro/escuro usando paleta propria do ArenaSys.
- Cadastro, login, recuperacao de senha e onboarding inicial.
- Gestao de reservas, horarios, status, mensalistas, folgas e configuracoes.
- Base multi-tenant com isolamento por arena.
- Realtime aplicado onde a operacao precisa refletir mudancas de agenda.
- Integracao de assinatura do SaaS com Asaas.
- Pipeline de validacao com lint, build, testes de smoke e scripts de QA.

## Produto

O ArenaSys separa dois fluxos que costumam ficar misturados em arenas pequenas e medias:

- **Operacao da arena:** dono/equipe gerenciam agenda, reservas, clientes e configuracoes.
- **Experiencia do jogador:** cliente acessa um link publico, escolhe quadra/campo, data e horario, e conclui a reserva.

O fluxo atual permite manter o pagamento no balcao. A evolucao planejada e permitir que o jogador pague a reserva pelo proprio link publico via Pix ou cartao, com confirmacao automatica, bloqueio temporario do horario e conciliacao financeira por arena.

## Modulos do Painel

| Modulo | Objetivo |
| --- | --- |
| Visao Geral | Leitura rapida da operacao do dia, agenda e indicadores essenciais. |
| Reservas | Criacao manual de reservas, acompanhamento por dia/semana/mes e controle de pagamentos. |
| Financeiro | Visao de caixa, receitas, pendencias e movimentos financeiros da arena. |
| Mensalistas | Controle de clientes recorrentes e relacao de recorrencia com a arena. |
| Gerenciar Folgas | Bloqueio de periodos em que a arena nao recebe reservas. |
| Configuracoes | Identidade da arena, link publico, contato, endereco, quadras e regras. |
| Suporte | Acesso rapido ao canal de suporte com contexto da arena logada. |

## Fluxos Principais

1. O dono da arena cria conta, inicia o trial e acessa o painel.
2. A arena configura perfil, dados comerciais, endereco, quadras, precos e CPF/CNPJ.
3. O sistema libera o link publico de reserva da arena.
4. Jogadores reservam pelo link publico ou a equipe cria reservas manuais pelo painel.
5. A equipe acompanha agenda, pagamentos pendentes, mensalistas, folgas e configuracoes.
6. A assinatura do SaaS segue separada do pagamento das reservas dos jogadores.

## Destaques Tecnicos

- Aplicacao frontend moderna com React, TypeScript e Vite.
- Backend gerenciado com Supabase Auth, Postgres, Realtime e Edge Functions.
- Modelagem multi-tenant para suportar multiplos donos de arena.
- Politicas e funcoes de banco para proteger fluxos publicos e administrativos.
- Integracao de pagamentos separando assinatura do SaaS e futuro pagamento de reservas.
- Testes e validacoes automatizadas para rotas publicas, fluxos criticos e qualidade visual.
- Deploy em Vercel com esteira de CI no GitHub Actions.

## Stack

| Area | Tecnologias |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router |
| UI | Tailwind CSS, Radix UI, Lucide |
| Dados | Supabase, PostgreSQL, TanStack Query |
| Auth e realtime | Supabase Auth, Supabase Realtime |
| Pagamentos | Asaas |
| Qualidade | Playwright, ESLint, scripts de QA |
| Deploy | Vercel, GitHub Actions |

## Estrutura do Projeto

```txt
src/
  components/admin/   Componentes especificos do painel administrativo
  components/ui/      Componentes base de interface
  contexts/           Contextos de autenticacao e reservas
  hooks/              Hooks de settings, assinatura, trial e utilitarios
  lib/                Clientes, funcoes auxiliares e regras compartilhadas
  pages/              Rotas publicas, landing, login, booking e admin
  pages/admin/        Views principais do painel administrativo
supabase/             Migrations, funcoes e configuracoes do backend
tests/                Testes Playwright, QA e validacoes automatizadas
scripts/              Scripts operacionais de teste, banco, deploy e auditoria
```

## Desenvolvimento Local

Requisitos:

- Node.js 24+ e npm 11+
- Node.js compativel com Vite
- Projeto Supabase configurado
- Variaveis de ambiente locais em `.env.local`

Comandos principais:

```bash
npm install
npm run dev
npm run lint
npm run build
npm run test
npm run test:e2e:smoke
```

## Variaveis de Ambiente

Este README nao documenta valores sensiveis. Para rodar localmente, o projeto espera variaveis como:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_PUBLIC_SUBDOMAIN=
TEST_EMAIL_DOMAIN=
RUN_ASAAS_TESTS=
```

> [!CAUTION]
> Nunca commite `.env.local`, service role keys, tokens de acesso, credenciais de teste reais ou arquivos gerados por execucao local.

## Qualidade e Validacao

Os checks mais usados no dia a dia sao:

| Comando | O que valida |
| --- | --- |
| `npm run test` | Suite critica com Supabase, auth, isolamento, billing e performance. |
| `npm run test:e2e:smoke` | Fluxos de smoke no navegador para admin e reserva publica. |
| `npm run lint` | Padroes de codigo e problemas estaticos. |
| `npm run build` | Build de producao com Vite e geracao PWA. |

O teste de signup pode ser marcado como indisponivel quando o Supabase bloquear criacao de usuarios por politica do projeto ou rate limit. Nesse caso o script exibe aviso explicito em vez de esconder o motivo.

## Aprendizados e Decisoes

- Um SaaS de nicho precisa equilibrar simplicidade comercial com uma base tecnica pronta para crescer.
- Pagamento da assinatura do dono e pagamento da reserva do jogador sao fluxos diferentes e devem evoluir separadamente.
- Realtime deve ser aplicado com criterio: agenda precisa de sincronizacao, paginas institucionais nao.
- A landing precisa vender a mudanca operacional, nao apenas listar funcionalidades.
- A operacao diaria deve ser rapida, nao uma tela pesada de cadastro.
- Trial e progresso de configuracao ficam concentrados na sidebar para evitar avisos redundantes.
- Cores de alerta devem aparecer apenas quando existe problema real.
- Componentes do painel devem usar os tokens visuais do ArenaSys, inclusive no tema escuro.
- O repositorio precisa ficar limpo para desenvolvimento continuo sem expor detalhes sensiveis de negocio.

## Status

Projeto privado em desenvolvimento ativo.

Frentes atuais:

- refinamento da experiencia administrativa e consistencia visual;
- organizacao de documentacao interna;
- planejamento do pagamento online de reservas;
- conciliacao financeira por arena;
- melhoria de relatorios;
- endurecimento de testes E2E;
- limpeza tecnica gradual do projeto;
- endurecimento de fluxos criticos antes de novas features grandes.
