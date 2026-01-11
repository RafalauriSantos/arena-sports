# Roadmap do Projeto - Arena Sports

## Visão Geral

Este documento consolida o raio-x de funcionalidades atuais e o feedback completo sobre o status do projeto Arena Sports, desde MVP até SaaS pronto para produção.

## Status Atual do Projeto

**Data:** 2026-01-08  
**Status Geral:** 🟡 **Pronto para testes beta, precisa de 2-3 sprints para produção**

### Pontos Fortes

#### 1. Arquitetura e Stack Tecnológica ⭐⭐⭐⭐⭐

- ✅ **Stack moderna**: React 19, TypeScript, Vite, Bun
- ✅ **Shadcn/UI + Tailwind**: Interface consistente e acessível
- ✅ **Supabase bem integrado**: Auth, DB, Storage, Realtime
- ✅ **Code organization**: Estrutura clara e responsabilidades separadas

#### 2. Multi-Tenancy ⭐⭐⭐⭐

- ✅ **RLS implementado**: Policies owner-only funcionando
- ✅ **Tenant isolation**: Filtragem consistente por `tenant_id`
- ✅ **Onboarding automatizado**: `fn_onboard_user` centraliza criação
- ✅ **Bypass de admin SaaS**: `saas_admin_users` para acesso VIP

#### 3. Billing (Parcial) ⭐⭐⭐

- ✅ **Edge Functions**: `asaas-create-checkout` e `asaas-webhook`
- ✅ **Schema preparado**: `tenant_subscriptions` com colunas ASAAS
- ✅ **Webhook idempotente**: Tabela `asaas_webhook_events`
- ⚠️ **Gap**: Completar migração, remover Stripe legacy, testar end-to-end

#### 4. Produto MVP ⭐⭐⭐⭐

- ✅ **Core funcional**: Agenda admin + link público + WhatsApp
- ✅ **Fluxo simplificado**: Pagamento no local
- ✅ **PWA ready**: Service Worker configurado
- ✅ **SEO básico**: Landing page com metadados

#### 5. Documentação ⭐⭐⭐⭐

- ✅ **Excelente**: Docs de planejamento (SPRINT, PLANO_ASAAS, AUDIT)
- ✅ **Migrations versionadas**: Schema como código

## Funcionalidades - Raio-X

### START (✅ Já Existe)

- ✅ **Agenda digital centralizada**: Visualiza horários ocupados/livres, gerencia reservas
- ✅ **Link público de agendamento**: Página pública por subdomínio
- ✅ **WhatsApp inteligente**: Mensagem pronta com detalhes da reserva
- ✅ **Gestão de quadras**: Cadastra/edita quadras e configurações básicas
- ✅ **Folgas/manutenção**: Bloqueia dias/horários
- ✅ **Dashboard mobile (PWA)**: Funciona bem no celular, instalável como app

### PRO (✅ Já Existe)

- ✅ **Relatórios de performance**: Indicadores de ocupação/receita por período

### PRO (🚀 Roadmap)

- ❌ **Sinal de reserva (removido)**: Configuração de sinal + cálculo, removido para simplificar
- ❌ **Desconto à vista (Pix) (removido)**: % desconto, removido - sem desconto online
- 🚀 **Gestão de mensalistas**: Controle recorrente de times fixos
- 🚀 **Fluxo de caixa completo**: Entradas + saídas + lucro + previsão
- 🚀 **Preço por faixa horária (manual)**: Tabela fixa por período
- ⚠️ **Promoções automáticas**: Lógica existe, mas não automática para horários vazios
- 🚀 **Multi-usuários (staff)**: Logins separados com permissões
- 🚀 **Lista de espera**: Capta interessados, avisa se horário vagar
- 🚀 **Cadastro de clientes (CRM simples)**: Nome/telefone + histórico
- 🚀 **Criador de torneios**: Chaves simples de mata-mata
- 🚀 **Bar & comanda**: Adiciona consumo na conta da reserva

## Gaps Críticos para Produção

### 1. Billing Completo

- **Prioridade**: 🔴 Alta
- **Esforço**: 1-2 sprints
- **Tarefas**:
  - Finalizar migração ASAAS
  - Remover código Stripe legacy
  - Testes end-to-end de cobrança
  - Configurar webhooks de produção

### 2. Observabilidade

- **Prioridade**: 🟡 Média
- **Esforço**: 0.5 sprint
- **Tarefas**:
  - Logs estruturados
  - Métricas de performance
  - Alertas de erro
  - Monitoramento de uptime

### 3. Multi-Usuários

- **Prioridade**: 🟡 Média
- **Esforço**: 1 sprint
- **Tarefas**:
  - Sistema de permissões
  - Gestão de staff
  - Logs de auditoria

### 4. Hardening de Produção

- **Prioridade**: 🟡 Média
- **Esforço**: 0.5 sprint
- **Tarefas**:
  - Rate limiting
  - Validação de input
  - Headers de segurança
  - Estratégia de backup

## Plano de Sprints

### Sprint 1: Billing Completo

- Finalizar ASAAS integration
- Testes de cobrança
- Remover código legacy

### Sprint 2: Multi-Usuários

- Sistema de permissões
- Gestão de staff
- Interface admin

### Sprint 3: Observabilidade + Hardening

- Logs e métricas
- Segurança de produção
- Otimizações de performance

## Métricas de Sucesso

### Funcionais

- Taxa de conversão de cadastro > 70%
- Tempo médio de onboarding < 5 min
- Uptime > 99.9%

### Técnicas

- Tempo de resposta < 500ms
- Taxa de erro < 0.1%
- Cobertura de testes > 80%

## Riscos e Mitigações

### Riscos Técnicos

- **Dependência Asaas**: Mitigação - testes extensivos, fallback local
- **Escalabilidade Supabase**: Mitigação - otimização de queries, índices
- **Complexidade multi-tenant**: Mitigação - isolamento rigoroso, testes

### Riscos de Produto

- **Adoção inicial**: Mitigação - landing page otimizada, suporte dedicado
- **Concorrência**: Mitigação - diferenciação por nicho (esportes coletivos)

## Conclusão

O Arena Sports possui uma base sólida (~75% pronto) com arquitetura moderna e funcionalidades core implementadas. Os próximos 2-3 sprints focarão em completar o billing, adicionar multi-usuários e implementar observabilidade para chegar à produção.
