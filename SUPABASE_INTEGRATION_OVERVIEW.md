# Estrutura Detalhada do Projeto e Integração com Supabase

## Visão Geral

Este documento descreve a estrutura de pastas/arquivos do projeto e detalha como cada parte está conectada ao Supabase. Também aponta áreas que ainda não utilizam Supabase ou onde a integração pode ser expandida.

---

## 1. Estrutura de Pastas e Arquivos

```
src/
  |-- components/
  |     |-- admin/
  |     |-- ui/
  |     |-- ...
  |-- contexts/
  |-- hooks/
  |-- lib/
  |-- pages/
  |-- types/
  |-- data/
  |-- ...
public/
  ...
```

### Principais Diretórios:

- **components/**: Componentes reutilizáveis (UI, admin, etc).
- **contexts/**: Contextos globais React (ex: autenticação, reservas).
- **hooks/**: Hooks customizados.
- **lib/**: Bibliotecas utilitárias (ex: supabaseClient).
- **pages/**: Páginas principais do app.
- **types/**: Tipos TypeScript compartilhados.
- **data/**: Mock data e dados estáticos.

---

## 2. Integração com Supabase

### 2.1. Núcleo da Integração

- **src/lib/supabaseClient.ts**
  - Cria e exporta o client do Supabase usando variáveis de ambiente.
  - Usado em todo o projeto para queries, mutations, autenticação e storage.

### 2.2. Contextos Globais

- **src/contexts/AuthContext.tsx**
  - Autenticação, perfil, tenant, onboarding, signOut, sessão.
  - Usa: `supabase.auth`, `.from('profiles')`, `.from('tenants')`, `.rpc()`.
- **src/contexts/BookingsContext.tsx**
  - Busca, criação, atualização e exclusão de reservas, quadras, slots.
  - Usa: `.from('bookings')`, `.from('courts')`, `.auth.getUser()`.

### 2.3. Páginas

- **src/pages/Login.tsx**
  - Login, cadastro, autenticação via Supabase.
  - Usa: `supabase.auth`, `.rpc()`.
- **src/pages/BookingPublic.tsx**
  - Consulta de horários, reservas públicas.
  - Usa: `.from('bookings')`, `.from('courts')`.
- **src/pages/admin/FolgasView.tsx**
  - Gerenciamento de folgas/fechamentos de quadra.
  - Usa: `.from('arena_closures')`.
- **src/pages/admin/AgendaMaster.tsx**
  - Agenda geral, exibição de reservas e horários.
  - Usa: `.from('bookings')`, `.from('courts')`.
- **src/pages/admin/ConfiguracoesView.tsx**
  - Configurações do tenant.
  - Usa: `.from('tenants')`, `.from('promotion_rules')`.
- **src/pages/admin/Dashboard.tsx**
  - Dados financeiros, métricas.
  - Usa: `.from('bookings')`, `.from('tenants')`.

### 2.4. Componentes Administrativos

- **src/components/admin/NewBookingModal.tsx**
  - Criação de reservas (admin).
  - Usa: `.from('bookings')`, `.auth.getUser()`.
- **src/components/admin/AvatarUpload.tsx**
  - Upload de avatar (Supabase Storage).
  - Usa: `supabase.storage`.
- **src/components/admin/DivulgacaoCard.tsx**
  - Gerenciamento de divulgação.
  - Usa: `.from('divulgacoes')` (se existir).
- **src/components/admin/MensalistasView.tsx**
  - Gestão de mensalistas.
  - Usa: `.from('mensalistas')` (se existir).
- **src/components/admin/SupportModal.tsx**
  - Suporte ao usuário, integração com dados do Supabase.

### 2.5. Hooks e Utilitários

- **src/hooks/useSettings.ts**
  - Busca e atualização de configurações do tenant, quadras, promoções.
  - Usa: `.from('tenants')`, `.from('courts')`, `.from('promotion_rules')`.
- **src/components/PaymentDrawer.tsx, PixPaymentModal.tsx**
  - Processos de pagamento e status, integrados ao Supabase.

### 2.6. Outros Componentes

- **src/components/BookingHistory.tsx, BookingConfirmation.tsx, TimeSlotCard.tsx**
  - Exibição de histórico, confirmação e detalhes de reservas, todos dependentes dos dados do Supabase.

---

## 3. Áreas Não Integradas ou com Integração Parcial

- **Landing Page (src/pages/Landing.tsx)**: Não depende do Supabase, apenas exibe conteúdo estático.
- **Componentes de UI genéricos (src/components/ui/...)**: Não usam Supabase diretamente.
- **Mock data (src/data/...)**: Usado apenas para testes/desenvolvimento.
- **Algumas páginas de erro ou NotFound**: Não usam Supabase.
- **Qualquer componente/página que não faz fetch, insert, update ou delete em dados reais.**

---

## 4. Sugestões de Expansão da Integração

- Garantir que todos os dados dinâmicos (ex: dashboards, relatórios, notificações) venham do Supabase.
- Centralizar ainda mais a lógica de dados em contextos/hooks para facilitar manutenção.
- Adicionar fallback/offline para áreas críticas, se necessário.
- Expandir uso do Supabase Storage para outros uploads (ex: documentos, banners).

---

## 5. Resumo Visual

- **Totalmente Integrado:** Contextos globais, páginas de reservas/admin, componentes administrativos, hooks de dados.
- **Parcial/Não Integrado:** Landing page, UI genérica, mock data, páginas estáticas.

---

Se precisar de um detalhamento ainda maior (por função ou linha), posso expandir este documento!
