# Melhorias Pendentes

Ultima atualizacao: 2026-05-11
Fonte principal: Notion > ArenaSys - Backlog de Produto > Database "Melhorias"

Este arquivo e apenas um espelho curto para orientar o trabalho no repositorio. O detalhamento completo, historico de ideias, notas comerciais e refinamentos de produto ficam no Notion.

## Prioridade Atual

1. Consolidar documentacao do repo sem expor detalhes sensiveis do SaaS.
2. Finalizar limpeza de arquivos e docs antigos.
3. Manter a landing page alinhada com o posicionamento atual.
4. Preparar a base conceitual para pagamento online de reservas.

## Epic Financeira: Pagamento Online de Reservas

- [ ] [#5] Pagamento online de reservas pelo link publico
  - Modulo: Financeiro / Reservas publicas
  - Dificuldade: Dificil
  - Situacao atual: Parcial. O fluxo de reserva e pagamento no balcao existe; falta pagamento online da reserva.
  - Escopo: jogador paga Pix/cartao pelo link publico da arena; reserva fica pendente, bloqueia horario temporariamente, confirma via webhook e libera se nao pagar no prazo.
  - Observacao: nao confundir com a assinatura do ArenaSys. Este fluxo e o pagamento do jogo pelo jogador para o dono da arena.
  - Link Notion: https://www.notion.so/3362113a24488194a16cd417c0b54ec7

- [ ] Integracao de pagamentos para donos de arena via sub-contas Asaas
  - Modulo: Financeiro / Marketplace
  - Dificuldade: Dificil
  - Situacao atual: Nao iniciado.
  - Escopo: cada dono de arena deve poder receber pagamentos dos jogos na conta correta, com possibilidade futura de split/comissao.
  - Link Notion: https://www.notion.so/35a2113a244881c3b970c8ea7053a9e7

- [ ] [#6] Timeout de reserva aguardando pagamento
  - Modulo: Financeiro / Reservas publicas
  - Dificuldade: Medio
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a2448810fad1fe519bd5d0077

- [ ] [#7] Politica de cancelamento e estorno configuravel por arena
  - Modulo: Financeiro
  - Dificuldade: Medio
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a244881c3b9dde8d61c28df50

- [ ] [#8] Notificacao de estorno processado para o jogador
  - Modulo: Financeiro
  - Dificuldade: Facil
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a2448810f905cd7e517487514

## Operacao da Arena

- [ ] [#2] Check-in do jogador na chegada
  - Modulo: Check-in / Operacao
  - Dificuldade: Medio
  - Situacao atual: Parcial no banco; falta fluxo de produto na UI.
  - Link Notion: https://www.notion.so/3362113a2448812db00ce34c148871df

- [ ] [#3] Controle de day use
  - Modulo: Check-in / Operacao
  - Dificuldade: Medio
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a244881d6b138f284689658c2

- [ ] [#4] Conciliacao fim de dia: agenda vs realidade
  - Modulo: Check-in / Operacao
  - Dificuldade: Medio
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a24488120a80dd0d962c07574

## Inteligencia e Relatorios

- [ ] [#9] Relatorio de horarios mais reservados
  - Situacao atual: Parcialmente implementado.
  - Link Notion: https://www.notion.so/3362113a244881c88defc812615cf20f

- [ ] [#10] Breakdown por genero nos relatorios
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a244881d0aa76dca16cded899

- [ ] [#11] Dashboard financeiro: caixa, estornos e visao geral
  - Situacao atual: Parcialmente implementado.
  - Link Notion: https://www.notion.so/3362113a2448817e95def2d15b8ac45f

- [ ] [#12] Mapa de calor de ocupacao das quadras
  - Situacao atual: Nao iniciado.
  - Link Notion: https://www.notion.so/3362113a24488113beebc45feb2fe705

- [ ] [#13] Dashboard avancado com KPIs de gestao
  - Situacao atual: Parcialmente implementado.
  - Link Notion: https://www.notion.so/3362113a244881748badf49f9e4faf88

## Regra de Execucao

- Notion e a fonte principal para estrategia, descoberta e contexto longo.
- Este arquivo deve ficar curto, apenas com prioridades e links.
- Mudancas de produto grandes devem ser registradas no Notion antes de virar tarefa de codigo.
- Commits devem separar documentacao, limpeza e implementacao de feature.
