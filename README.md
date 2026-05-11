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

## O Que Foi Construido

- Landing page comercial com copy, SEO e fluxo de conversao.
- Agenda publica por arena em rota dedicada.
- Painel administrativo para operacao diaria.
- Cadastro, login, recuperacao de senha e onboarding inicial.
- Gestao de reservas, horarios, status e disponibilidade.
- Base multi-tenant com isolamento por arena.
- Realtime aplicado onde a operacao precisa refletir mudancas de agenda.
- Integracao de assinatura do SaaS com provedor de pagamento.
- Pipeline de validacao com lint, build, QA e deploy automatizado.

## Produto

O ArenaSys separa dois fluxos que costumam ficar misturados em arenas pequenas e medias:

- **Operacao da arena:** dono/equipe gerenciam agenda, reservas, clientes e configuracoes.
- **Experiencia do jogador:** cliente acessa um link publico, escolhe quadra/campo, data e horario, e conclui a reserva.

O fluxo atual permite manter o pagamento no balcao. A evolucao planejada e permitir que o jogador pague a reserva pelo proprio link publico via Pix ou cartao, com confirmacao automatica, bloqueio temporario do horario e conciliacao financeira por arena.

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

## Aprendizados e Decisoes

- Um SaaS de nicho precisa equilibrar simplicidade comercial com uma base tecnica pronta para crescer.
- Pagamento da assinatura do dono e pagamento da reserva do jogador sao fluxos diferentes e devem evoluir separadamente.
- Realtime deve ser aplicado com criterio: agenda precisa de sincronizacao, paginas institucionais nao.
- A landing precisa vender a mudanca operacional, nao apenas listar funcionalidades.
- O repositorio precisa ficar limpo o bastante para desenvolvimento continuo sem expor detalhes sensiveis de negocio.

## Status

Projeto privado em desenvolvimento ativo.

Frentes atuais:

- refinamento da landing page e posicionamento comercial;
- organizacao de documentacao interna;
- planejamento do pagamento online de reservas;
- limpeza tecnica gradual do projeto;
- endurecimento de fluxos criticos antes de novas features grandes.
