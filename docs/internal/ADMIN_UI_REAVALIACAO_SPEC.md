# Reavaliacao UI Admin

## Objetivo

Reavaliar e refinar as telas administrativas do ArenaSys com o mesmo nivel de cuidado aplicado na landing e no login, mantendo o sistema mais operacional, menos redundante e visualmente consistente.

Este plano usa duas referencias externas clonadas fora do repo:

- `C:\Users\Rafael lauri\PROJETOS\_references\ribeirogab\specwright`: referencia de processo. A parte util e o fluxo por milestone, issue, criterios de aceite, tarefas e validacao em runtime.
- `C:\Users\Rafael lauri\PROJETOS\_references\ribeirogab\portfolio`: referencia visual. A parte util e o uso de componentes pequenos, hierarquia limpa, tokens de tema, animacao sutil e composicao com menos ruido.

Nao vamos copiar componentes diretamente. As referencias servem para orientar metodo e criterio.

## Escopo

Telas e componentes administrativos:

- Dashboard
- Agenda
- Financeiro
- Mensalistas
- Folgas
- Configuracoes
- Sidebar, navegacao mobile, banners de trial e estados de paywall

## Fora de escopo

- Landing page publica
- Fluxo de checkout/pagamento fora do que aparece no admin
- Alteracoes de banco, Supabase ou regras de negocio
- Reescrita completa de arquitetura
- Instalacao obrigatoria do plugin `specwright`

## Principios de design

1. Operacional antes de promocional.
   O usuario logado ja validou o produto. A UI deve ajudar a trabalhar, nao convencer de novo.

2. Um dado, um lugar principal.
   Evitar repetir receita, reservas, ocupacao e alertas em hero, card e tabela ao mesmo tempo.

3. Hierarquia visual curta.
   Cada tela deve ter: titulo claro, contexto curto, acao primaria evidente, filtros/atalhos previsiveis e conteudo principal.

4. Identidade ArenaSys consistente.
   Usar azul e amarelo como acentos principais, com fundo claro, bordas suaves e estados neutros. Verde/emerald legado so deve aparecer se tiver significado real.

5. Menos animacao, mais polimento.
   Animacoes devem ser sutis e funcionais. Nada de pulso, bounce ou efeito chamativo sem motivo operacional.

6. Componentes densos, mas respiraveis.
   Como e um SaaS de gestao, a UI deve ser escaneavel e eficiente, nao parecer landing page dentro do painel.

## Milestone

### M1 - Consolidar o admin visual

Resultado esperado: um usuario autenticado consegue navegar por Dashboard, Agenda, Financeiro, Mensalistas, Folgas e Configuracoes sem sentir quebra de identidade visual, excesso de CTA ou redundancia entre telas.

### Sucesso do milestone

- As telas principais usam a mesma linguagem de cabecalho, card, tabela, filtro, botoes e estados vazios.
- Os principais indicadores aparecem onde ajudam a decisao, sem repeticao desnecessaria.
- A navegacao lateral/mobile fica consistente com o login e com a landing, sem misturar estilos antigos.
- Build e QA passam.
- Pelo menos desktop e mobile sao verificados no navegador quando houver sessao disponivel.

## Issues de trabalho

### Issue 1 - Agenda operacional

Proposito: deixar a agenda mais clara para uso diario, com foco em reservas, filtros e acoes rapidas.

Criterios de aceite:

- AC-1: a tela mostra o contexto do dia/periodo sem competir com a area principal de reservas.
- AC-2: filtros e botoes de acao ficam agrupados em uma faixa previsivel.
- AC-3: estados vazios dizem qual acao tomar sem parecer campanha de marketing.
- AC-4: desktop e mobile nao apresentam sobreposicao de texto, botoes ou cards.

Arquivos provaveis:

- `src/pages/admin/AgendaMaster.tsx`
- componentes compartilhados usados pela agenda

### Issue 2 - Financeiro enxuto

Proposito: transformar a tela financeira em uma leitura rapida de caixa, receita e pendencias.

Criterios de aceite:

- AC-1: receita, despesas e saldo aparecem em hierarquia clara.
- AC-2: graficos e listas nao repetem os mesmos dados sem acrescentar decisao.
- AC-3: filtros de periodo ficam claros e proximos dos dados que controlam.
- AC-4: estados de carregamento, vazio e erro seguem o mesmo padrao visual do admin.

Arquivos provaveis:

- `src/pages/admin/FinanceiroView.tsx`

### Issue 3 - Cadastros recorrentes

Proposito: alinhar Mensalistas, Folgas e Configuracoes para parecerem partes do mesmo produto.

Criterios de aceite:

- AC-1: Mensalistas usa hierarquia de lista/formulario consistente com Agenda e Financeiro.
- AC-2: Folgas usa linguagem visual de disponibilidade, sem cards promocionais.
- AC-3: Configuracoes separa blocos por decisao real do gestor.
- AC-4: modais, inputs e acoes destrutivas seguem um padrao unico.

Arquivos provaveis:

- `src/pages/admin/MensalistasView.tsx`
- `src/pages/admin/FolgasView.tsx`
- `src/pages/admin/ConfiguracoesView.tsx`

### Issue 4 - Shell do admin

Proposito: manter navegacao, sidebar, mobile nav, trial e paywall como uma camada unica de produto.

Criterios de aceite:

- AC-1: sidebar e mobile nav usam a mesma identidade visual.
- AC-2: banners de trial avisam sem empurrar o layout.
- AC-3: paywall informa bloqueio e proximo passo sem parecer landing page.
- AC-4: cores antigas sem funcao sao removidas ou normalizadas.

Arquivos provaveis:

- `src/pages/admin/Dashboard.tsx`
- `src/components/admin/TrialBanner.tsx`
- `src/components/admin/TrialCountdown.tsx`
- `src/components/admin/AdminBottomNav.tsx`

## Ordem recomendada

1. Agenda
2. Financeiro
3. Mensalistas e Folgas
4. Configuracoes
5. Shell final: sidebar, mobile nav, trial e paywall

Dashboard ja recebeu um primeiro corte, entao agora ele deve servir como referencia provisoria, nao como novo foco.

## Checklist por tela

Antes de editar:

- Identificar dados repetidos.
- Identificar CTAs demais.
- Identificar cores legadas fora da identidade atual.
- Identificar cards dentro de cards.
- Identificar estados vazios genericos.
- Identificar textos longos em botoes ou badges.
- Identificar qualquer comportamento que muda layout ao alternar modo/estado.

Depois de editar:

- Rodar `npm run build`.
- Rodar `npm run test:qa`.
- Verificar desktop.
- Verificar mobile.
- Conferir overflow horizontal.
- Conferir textos longos.
- Conferir foco/teclado em botoes e inputs principais.

## Validacao minima

Comandos:

```powershell
npm run build
npm run test:qa
```

Inspecao visual:

- `http://127.0.0.1:5000/dashboard`
- `http://127.0.0.1:5000/dashboard?view=agenda` se a rota suportar view por query
- caso contrario, navegar manualmente pelo menu apos login

Se nao houver sessao autenticada disponivel, marcar a inspecao do admin como `needs-human-verification` e ainda assim validar build/QA.

## Proximo passo imediato

Comecar pela Agenda. Antes de editar, mapear a estrutura atual de `AgendaMaster.tsx`, listar redundancias visuais e escolher um layout alvo coerente com o Dashboard revisado.
