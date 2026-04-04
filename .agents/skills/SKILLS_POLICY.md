# Skills Policy - ArenaSys

Ultima atualizacao: 2026-04-04

Objetivo: padronizar quais skills podem ser usadas no projeto com foco em seguranca, confiabilidade e ganho real de produtividade.

## Criterios minimos de confianca

Uma skill so entra em uso regular quando atender ao minimo abaixo:

1. Fonte confiavel (github, supabase, vercel-labs, microsoft ou mantenedor reconhecido).
2. Adocao relevante (preferencia 1000+ installs; ideal 5000+).
3. Escopo claro (sem instrucoes amplas e sem necessidade de acesso desnecessario).
4. Revisao manual do conteudo da skill antes de uso em tarefas criticas.
5. Sem uso direto em fluxos sensiveis sem dupla validacao humana (auth, pagamentos, secrets, deploy).

## Matriz de aprovacao

## Aprovadas (uso imediato)

- create-readme
  - Motivo: escopo claro, util para manter README enxuto e padronizado.
  - Limite: revisar sempre antes de commit.

- vercel-react-best-practices
  - Motivo: boas praticas tecnicas para React e performance.
  - Limite: aplicar com criterio ao contexto do ArenaSys.

- frontend-design
  - Motivo: melhora qualidade visual e consistencia da UX.
  - Limite: nao substituir diretrizes de produto nem acessibilidade.

- supabase-postgres-best-practices
  - Origem: supabase/agent-skills@supabase-postgres-best-practices
  - Risco na instalacao: Gen Safe, Socket 0 alerts, Snyk Low Risk.
  - Motivo: alta aderencia ao stack (Supabase/Postgres) e boa confianca de fonte.
  - Limite: revisao manual obrigatoria para qualquer sugestao em auth/RLS.

- accessibility
  - Origem: addyosmani/web-quality-skills@accessibility
  - Risco na instalacao: Gen Safe, Socket 0 alerts, Snyk Med Risk.
  - Motivo: melhora de UX e acessibilidade com boa adocao.
  - Limite: aplicar com regressao visual e validacao de contraste/foco.

## Em avaliacao (uso controlado)

- readme-blueprint-generator
  - Motivo: util para estrutura de docs, mas instalacao apresentou alerta de risco elevado.
  - Regra temporaria: usar apenas em contexto local e sem tocar em informacoes sensiveis.

- playwright-e2e-testing
  - Origem: bobmatnyc/claude-mpm-skills@playwright-e2e-testing
  - Risco na instalacao: Gen Critical Risk, Socket 0 alerts, Snyk Low Risk.
  - Motivo: cobre fluxos criticos de SaaS.
  - Regra temporaria: uso apenas em ambiente local/sandbox ate revisao aprofundada.

## Bloqueadas

- Qualquer skill sem fonte rastreavel.
- Qualquer skill com comportamento obscuro ou que tente operar fora do escopo solicitado.
- Qualquer skill com baixa confianca em tarefas sensiveis (auth, billing, secrets, banco de producao).

## Quarentena de risco

- playwright-e2e-testing
  - Estado: instalado, mas com uso restrito.
  - Nao usar para alterar codigo de producao automaticamente.
  - Permitido apenas para gerar checklists e cenarios de teste em branch isolada.
  - Reavaliar apos auditoria manual do conteudo da skill.

## Regras operacionais

1. Toda nova skill entra primeiro em Em avaliacao.
2. Para mover para Aprovadas, exigir:
   - revisao manual da skill
   - teste em tarefa nao critica
   - validacao do resultado por humano
3. Toda alteracao relevante em producao precisa de revisao manual final, mesmo com skill aprovada.
4. Skills nunca substituem controle de seguranca do repositorio (.gitignore, secrets, code review e CI).

## Proxima rodada recomendada

1. Rodar piloto de 7 dias com supabase-postgres-best-practices e accessibility.
2. Auditar manualmente playwright-e2e-testing antes de liberar uso amplo.
3. Reclassificar a matriz ao fim do piloto (aprovada, em avaliacao ou bloqueada).
