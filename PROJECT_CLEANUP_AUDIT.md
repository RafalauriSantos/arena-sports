# Auditoria de Limpeza do Projeto

Data: 2026-05-11

Objetivo: identificar pastas, arquivos duplicados, artefatos locais e possiveis sobras que estao poluindo a visao do projeto.

## Resumo Executivo

O projeto nao esta com lixo versionado grave. A maior parte da poluicao visual vem de artefatos locais ignorados pelo Git e de junctions de skills/agentes.

Principais pontos:

- `dist/`, `test-results/`, `playwright-report/` e `.codex-devserver/` sao artefatos locais seguros para limpar.
- `skills/` e `.claude/skills/` nao sao copias reais; sao junctions apontando para `.agents/skills/`.
- `.agents/skills/` e a pasta real versionada de skills. Se quiser simplificar, ela e a fonte de verdade.
- `scripts/` tem varios scripts avulsos nao referenciados no `package.json`; alguns parecem historicos de migracao/debug.
- `supabase/migrations/` tem muitas migrations historicas, especialmente uma sequencia longa de tentativas de policy publica. Nao remover sem estrategia de banco.
- `.gitignore` tem duplicacoes internas e tambem ignora `.agents/`, embora alguns arquivos de `.agents/skills` estejam versionados.

## Pastas Locais que Podem Ser Limpas com Segurança

Essas pastas sao artefatos gerados localmente e nao devem ser parte do codigo-fonte:

- `dist/`
- `test-results/`
- `playwright-report/`
- `.codex-devserver/`

Observacao:

- `node_modules/` tambem pode ser removida quando quiser recuperar espaco, mas e normal em projeto Node/npm e sera recriada com `npm install`.
- `.vercel/` e local do Vercel e ja esta ignorada. Pode ser mantida porque guarda o link do projeto local.

## Duplicidade Aparente de Agentes e Skills

Foram encontradas tres frentes:

- `.agents/skills/`
- `.claude/skills/`
- `skills/`

Resultado da analise:

- `.agents/skills/` contem as pastas reais.
- `.claude/skills/*` sao junctions apontando para `.agents/skills/*`.
- `skills/*` tambem sao junctions apontando para `.agents/skills/*`.

Isso significa que parecem duplicadas no explorador, mas nao duplicam o conteudo real.

Recomendacao:

- Manter `.agents/skills/` como fonte principal.
- Se a poluicao visual incomodar, remover apenas os junctions locais `skills/` e `.claude/skills/`, desde que nenhuma ferramenta sua dependa desses caminhos.
- Nao remover `.agents/skills/` sem decidir que o projeto nao deve carregar skills no repositorio.

## Arquivos e Pastas Versionados de Agentes

Arquivos versionados relacionados a agents:

- `.agents/skills/SKILLS_POLICY.md`
- `.agents/skills/accessibility/SKILL.md`
- `.agents/skills/create-readme/SKILL.md`
- `.agents/skills/frontend-design/SKILL.md`
- `.agents/skills/playwright-e2e-testing/SKILL.md`
- `.agents/skills/readme-blueprint-generator/SKILL.md`
- `.agents/skills/supabase-postgres-best-practices/SKILL.md`
- `.agents/skills/vercel-react-best-practices/SKILL.md`

Observacao:

O `.gitignore` ignora `.agents/`, mas esses arquivos ja estao rastreados pelo Git. Isso cria confusao.

Recomendacao:

- Ou manter `.agents/skills` versionado e ajustar o `.gitignore` para deixar isso claro.
- Ou remover `.agents/skills` do Git se essas skills forem apenas locais.

Minha sugestao: manter por enquanto, porque usamos essas skills no fluxo de desenvolvimento.

## Scripts Possivelmente Historicos ou Avulsos

Scripts em `scripts/` que nao aparecem referenciados no `package.json`:

- `apply-a11y-improvements.ts`
- `apply-contact-fields-simple.ts`
- `apply-half-hour-price-migration.ts`
- `apply-migration-contact-fields.ts`
- `apply-migration-direct.ts`
- `apply-public-access-grants.ts`
- `apply-public-grants-direct.ts`
- `apply-security-migration.ts`
- `check-founders-status.ts`
- `configure-secrets.ts`
- `drop-tenants-view.ts`
- `execute-query-safe.ts`
- `execute-query.ts`
- `get-tenant-id.ts`
- `list-emails.ts`
- `test-link-real-browser.ts`
- `test-performance.ts`
- `test-security-views-fix.ts`
- `verificar-asaas-env.ts`
- `verifyAsaasSupabase.ts`

Classificacao:

- Provavelmente historicos/debug: `apply-*`, `drop-tenants-view.ts`, `test-security-views-fix.ts`.
- Utilitarios manuais que talvez ainda sejam uteis: `execute-query*.ts`, `get-tenant-id.ts`, `list-emails.ts`, `check-founders-status.ts`.
- Podem virar comandos oficiais ou ir para uma pasta `scripts/archive/`.

Recomendacao:

1. Nao apagar direto.
2. Criar `scripts/archive/` para scripts historicos.
3. Manter no root de `scripts/` apenas scripts usados pelo `package.json` ou operacionais recorrentes.

## Possiveis Arquivos Mortos no `src`

Arquivos que nao tiveram referencia clara por import direto:

- `src/config/focusIndicators.ts`
- `src/data/adminMockData.ts`
- `src/data/mockData.ts`
- `src/hooks/useRealtimeWithFallback.ts`
- `src/components/admin/StatusBadge.d.ts`

Observacoes:

- `src/lib/services/tenant-settings.ts` esta em uso por `OperatingHoursSettings.tsx`.
- `src/components/admin/database.types.ts` esta em uso por `src/lib/supabaseClient.ts`.
- Varios componentes de `src/components/ui/` parecem sem uso direto, mas sao shadcn/Radix e podem ser mantidos como biblioteca local.

Recomendacao:

- Confirmar com build/testes depois de remover cada candidato.
- Comecar por `focusIndicators.ts`, `adminMockData.ts`, `mockData.ts` e `StatusBadge.d.ts`.
- Ter mais cautela com `useRealtimeWithFallback.ts`, porque pode ser hook reservado para fallback realtime.

## Duplicidade Real ou Semantica no Admin

Ha dois arquivos com nome parecido:

- `src/components/admin/MensalistasView.tsx`
- `src/pages/admin/MensalistasView.tsx`

Ambos aparecem referenciados:

- O componente e usado em `AdminDashboardNew.tsx`.
- A pagina e usada em `Dashboard.tsx`.

Recomendacao:

- Nao apagar agora.
- Se quiser clareza, renomear futuramente para separar responsabilidade:
  - `src/components/admin/MensalistasPanel.tsx`
  - `src/pages/admin/MensalistasView.tsx`

## Supabase

A pasta `supabase/migrations/` e grande e historica. Ha muitas migrations relacionadas a public booking policy entre `20260121000007` e `20260121000028`.

Recomendacao:

- Nao apagar migrations individualmente em projeto ja aplicado.
- Se quiser limpar de verdade, fazer uma estrategia de baseline:
  1. Confirmar ambiente de producao.
  2. Gerar schema consolidado.
  3. Criar nova baseline.
  4. Arquivar migrations antigas fora do fluxo ativo.

As variantes antigas de Edge Functions (`index-fixed.ts` e `index-improved.ts`)
foram removidas durante a auditoria de observabilidade. As functions ativas
ficam concentradas em `index.ts`.

## Documentos Raiz

Documentos atuais na raiz:

- `README.md`
- `LANDING_PAGE_EXECUTION_PLAN.md`
- `DEPLOY_PENDING_SECRETS.md`
- `COMO_LIMPAR_CACHE.md`
- `CONFIGURAR_WEBHOOK_ASAAS.md`
- `MELHORIAS_PENDENTES.md`
- `PERFORMANCE_IMPROVEMENTS.md`

Recomendacao:

- Manter `README.md`, `LANDING_PAGE_EXECUTION_PLAN.md` e `DEPLOY_PENDING_SECRETS.md`.
- Considerar mover para `docs/`:
  - `COMO_LIMPAR_CACHE.md`
  - `CONFIGURAR_WEBHOOK_ASAAS.md`
  - `MELHORIAS_PENDENTES.md`
  - `PERFORMANCE_IMPROVEMENTS.md`

Isso reduz poluicao na raiz sem perder historico.

## `.gitignore`

Problemas encontrados:

- Bloco de logs duplicado.
- Bloco de editor duplicado.
- Linha estranha `-e`.
- Ignora `.agents/`, mas `.agents/skills` esta parcialmente versionado.

Recomendacao:

- Limpar `.gitignore`.
- Decidir regra explicita para `.agents/skills`:
  - manter versionado, com excecao no `.gitignore`;
  - ou remover do Git e tratar como local.

## Plano de Limpeza Recomendado

### Fase 1: Limpeza Local Segura

Apagar artefatos locais:

- `dist/`
- `test-results/`
- `playwright-report/`
- `.codex-devserver/`

### Fase 2: Organizar Raiz

Mover docs operacionais para `docs/`.

### Fase 3: Corrigir `.gitignore`

Remover duplicacoes e deixar claro o comportamento de `.agents/skills`.

### Fase 4: Arquivar Scripts Historicos

Criar `scripts/archive/` e mover scripts nao referenciados, um grupo por vez.

### Fase 5: Remover Possiveis Arquivos Mortos

Remover candidatos pequenos em commits separados e rodar:

```bash
npm run build
npm run test:qa
```

### Fase 6: Supabase Baseline

Somente depois:

- avaliar consolidation/baseline de migrations;
- comparar functions Asaas duplicadas;
- remover variantes antigas com seguranca.
