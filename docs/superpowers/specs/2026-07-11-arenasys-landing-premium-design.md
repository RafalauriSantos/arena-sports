# Landing ArenaSys — Vitrine de Produto Premium

**Data:** 2026-07-11  
**Status:** Aprovado para planejamento

## Objetivo

Transformar a landing pública em uma vitrine de produto de alto padrão que explica, em poucos segundos, os dois lados do ArenaSys: a gestão da arena e a reserva feita pelo cliente.

O visitante precisa entender que o produto oferece uma operação organizada para o dono da arena e uma reserva simples para quem quer jogar.

## Direção visual aprovada

Aplicar uma estética editorial, clara e precisa, baseada no design system já usado no produto. A landing não deve inventar uma marca paralela nem usar cores de efeito que conflitem com o painel.

### Tokens-base

- Fundo: `--az-paper` (`#F6F5F1`)
- Superfícies: `--az-surface` (`#FFFFFF`)
- Texto principal: `--az-ink` (`#16181A`)
- Texto secundário: `--az-ink-soft` (`#6B6D66`)
- Ação e navegação: `--az-navy` (`#16324F`)
- Sucesso e disponibilidade: `--az-turf` (`#2F6B45`)
- Destaque pontual: `--az-clay` (`#B5652F`)
- Bordas: `--az-line` (`#E3E1D8`)
- Raios: 12 px para cartões e 8 px para controles

O azul-marinho sustenta chamadas para ação, a marca e pontos de navegação. O verde é reservado a disponibilidade, sucesso e sinais operacionais. O tom terracota é usado apenas para pequenos destaques, nunca como cor dominante.

## Estrutura e componentes

### Cabeçalho

- Cabeçalho claro e opaco sobre as seções claras, com texto em `--az-ink` e CTA em `--az-navy`.
- Ao passar sobre uma seção escura, manter contraste explícito; não depender de estilos herdados ou utilitários globais.
- Menu mobile com ícone, painel e links com contraste validado nos dois estados: fechado e aberto.
- Um único CTA de criação de agenda e um acesso discreto para login.

### Hero e prova de produto

- Composição em duas colunas no desktop: narrativa e CTAs à esquerda; prova visual à direita.
- A prova visual usa os assets existentes do produto, `public/images/mockup-dashboard.png` e `public/images/mockup-mobile.png`, sem substituí-los por ilustrações genéricas.
- O notebook representa o dono da arena: visão geral, agenda, ocupação e receita.
- O iPhone representa o cliente: seleção de data, quadra e horário disponível.
- O notebook é a peça principal; o iPhone o complementa em primeiro plano, sem esconder informações importantes nem competir com o título.
- Em telas pequenas, os dispositivos viram uma sequência vertical com área de respiro e sem corte lateral ou sobreposição que prejudique leitura.
- A animação será discreta, respeitará `prefers-reduced-motion` e não pode reduzir contraste ou legibilidade.

### Seções intermediárias

- Soluções, funcionamento, benefícios e preços usam o mesmo ritmo de grade, borda e espaçamento.
- Cartões deixam de usar sombras pesadas, gradientes conflitantes ou cores que não pertencem aos tokens do sistema.
- Ícones usam azul-marinho por padrão, verde somente para confirmação/disponibilidade e terracota somente para marcadores de Founder ou informação especial.
- A seção de preços continua clara e objetiva, mas recebe hierarquia de leitura mais forte e contraste garantido nos controles de período.

### Conversão e FAQ

- Cada área de conversão contém uma ação primária clara, com rótulo coerente: criar agenda, testar grátis ou começar agora.
- A ação secundária explica o produto ou leva a uma seção relevante; não deve parecer concorrente da ação primária.
- FAQ mantém respostas diretas, com controle visual consistente e foco acessível.

## Responsividade e acessibilidade

- Validar em desktop e em 390 px de largura.
- Nenhum conteúdo, dispositivo ou CTA pode gerar rolagem horizontal.
- Texto normal e controles devem atender contraste legível contra o fundo em todos os estados.
- Estados de foco precisam usar o azul-marinho e permanecer visíveis em fundo claro e escuro.
- O menu mobile deve anunciar o estado expandido e exibir controles visíveis.
- Os mockups são conteúdo demonstrativo: usar textos alternativos descritivos e não duplicar informação funcional crítica somente dentro da imagem.

## Escopo técnico

- Priorizar `src/pages/Landing.tsx`, `src/index.css` e os componentes em `src/components/landing/`.
- Reaproveitar os tokens existentes e os assets do diretório público.
- Não modificar o fluxo de login, o painel administrativo, a reserva pública nem regras de cobrança.
- Não sobrescrever mudanças locais fora do escopo da landing.

## Critérios de aceitação

1. A navegação é legível em desktop e mobile, aberta e fechada.
2. A primeira dobra deixa explícito o que o dono administra e o que o cliente reserva.
3. Notebook e iPhone são visualmente fiéis ao produto e responsivos.
4. Cores, raios, bordas e espaçamentos seguem os tokens do ArenaSys.
5. A página não contém desalinhamentos, cortes ou contraste insuficiente nos pontos auditados.
6. Os CTAs principais preservam seus destinos atuais.
7. Lint, verificação de tipos, testes e build relevantes passam após a implementação.
