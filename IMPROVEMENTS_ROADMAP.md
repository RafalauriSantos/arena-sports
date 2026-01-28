# 🚀 Roadmap de Melhorias - ArenaSys

Este documento lista os pontos de melhoria identificados para o projeto, priorizados por impacto e criticidade.

## 1. Arquitetura & Qualidade de Código (Crítico) 🛠️

- **Refatorar `Dashboard.tsx`**:
  - **Problema**: Arquivo monolítico com ~1500 linhas.
  - **Ação**: Quebrar em sub-componentes (`AgendaView`, `FinanceiroView`, `ConfigsView`, `Sidebar`).
  - **Benefício**: Facilita manutenção, testes e leitura do código.
- **Padronização de Idioma**:
  - **Problema**: Mistura de Inglês e Português no código.
  - **Ação**: Adotar padrão (Sugestão: Código/Comentários em Inglês, Interface em Português).
- **Remover Hardcoded Values**:
  - **Problema**: Valores como limites de planos e preços estão fixos no código (`asaas-create-checkout`).
  - **Ação**: Mover para variáveis de ambiente ou tabela de configuração no banco.

## 2. UX/UI & Design (Alto Impacto) 🎨

- **Dashboard Premium**:
  - **Ação**: Aplicar o design system "Apple-style" (glassmorphism, tipografia refinada, sombras sutis) do Landing Page no Dashboard administrativo.
- **Mobile First Real**:
  - **Ação**: Otimizar a experiência de gestão (Admin) para telas pequenas, permitindo que donos de quadra gerenciem tudo pelo celular.

## 3. Funcionalidades (Roadmap de Produto) 🚀

- **Notificações WhatsApp Reais**:
  - **Ação**: Integrar API de envio de mensagens (ex: Twilio, Z-API) para confirmar agendamentos e reduzir no-shows. Atualmente existem apenas placeholders.
- **Múltiplos Usuários (Staff)**:
  - **Ação**: Implementar sistema de permissões para permitir funcionários (recepção) com acesso restrito (só agenda, sem financeiro).
- **Analytics Avançado**:
  - **Ação**: Gráficos de ocupação por horário, receita por dia da semana e LTV (Life Time Value) dos clientes.

## 4. Segurança & DevOps 🔒

- **CI/CD**:
  - **Ação**: Configurar GitHub Actions para rodar testes automatizados (`bun run scripts/test...`) em cada Pull Request.
- **Database Backup**:
  - **Ação**: Garantir que o Supabase esteja configurado para backups diários (PITR se possível no plano Pro).
- **Row Level Security (RLS)**:
  - **Ação**: Revisão completa das políticas de segurança do banco de dados para garantir isolamento total entre tenants.
