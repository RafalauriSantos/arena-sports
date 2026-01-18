# 📋 Guia de Testes Manuais - Arena Sports

## 🎯 Status Atual

**Testes Automatizados:** ✅ 32/33 passando (97%)  
**Próximo Passo:** ✅ **Testes Manuais de UI/UX e Integrações**

---

## ✅ Checklist de Testes Manuais

### 1. 📝 Cadastro e Onboarding

#### 1.1 Tela de Login/Cadastro
- [ ] **Acessar `/login`**
  - [ ] Formulário de cadastro aparece corretamente
  - [ ] Campos obrigatórios marcados (email, senha, nome da empresa)
  - [ ] Validação de email em tempo real
  - [ ] Mensagem de erro clara para email inválido
  - [ ] Mensagem de erro clara para senha muito curta
  - [ ] Botão de alternar entre "Login" e "Cadastrar" funciona

#### 1.2 Cadastro de Novo Usuário
- [ ] **Criar nova conta**
  - [ ] Preencher formulário com dados válidos
  - [ ] Clicar em "Cadastrar"
  - [ ] Mensagem de sucesso aparece
  - [ ] Redirecionamento para tela de Welcome/Onboarding

#### 1.3 Tela de Welcome/Onboarding
- [ ] **Acessar `/welcome` após cadastro**
  - [ ] Formulário de onboarding aparece
  - [ ] Campo "Nome da Empresa" preenchido automaticamente (se informado no cadastro)
  - [ ] Validação de campos obrigatórios
  - [ ] Botão "Continuar" funciona
  - [ ] Mensagens de erro claras e objetivas

#### 1.4 Validação de CPF/CNPJ
- [ ] **No formulário de configurações ou onboarding**
  - [ ] Campo CPF/CNPJ aceita apenas números
  - [ ] Validação de CPF válido (11 dígitos, dígito verificador)
  - [ ] Validação de CNPJ válido (14 dígitos, dígito verificador)
  - [ ] Mensagem de erro clara para CPF/CNPJ inválido
  - [ ] Campo é obrigatório antes de fazer checkout (se aplicável)

#### 1.5 Criação da Primeira Quadra no Onboarding
- [ ] **Após completar onboarding**
  - [ ] Tela de criação de quadra aparece automaticamente
  - [ ] Formulário permite criar primeira quadra
  - [ ] Validação de campos obrigatórios (nome, esportes)
  - [ ] Quadra é criada com sucesso
  - [ ] Redirecionamento para dashboard após criação

---

### 2. 🏠 Dashboard e Navegação

#### 2.1 Dashboard Principal
- [ ] **Acessar `/` ou `/dashboard` após login**
  - [ ] Dashboard carrega corretamente
  - [ ] Estatísticas básicas aparecem (reservas do dia, etc)
  - [ ] Navegação lateral funciona
  - [ ] Logo/header aparecem corretamente

#### 2.2 Navegação entre Telas
- [ ] **Testar todas as rotas principais**
  - [ ] `/` - Dashboard
  - [ ] `/agendamentos` - Lista de reservas
  - [ ] `/quadras` - Lista de quadras
  - [ ] `/configuracoes` - Configurações
  - [ ] Links no menu funcionam corretamente
  - [ ] Botão de logout funciona

---

### 3. 🏟️ Gestão de Quadras

#### 3.1 Criar Nova Quadra
- [ ] **Acessar `/quadras` → "Nova Quadra"**
  - [ ] Modal ou formulário abre corretamente
  - [ ] Campos obrigatórios marcados
  - [ ] Upload de imagens funciona (se aplicável)
  - [ ] Seleção de esportes funciona
  - [ ] Definir preço base funciona
  - [ ] Quadra é criada com sucesso
  - [ ] Quadra aparece na lista após criação

#### 3.2 Editar Quadra
- [ ] **Clicar em "Editar" em uma quadra existente**
  - [ ] Formulário preenchido com dados atuais
  - [ ] Alterações são salvas corretamente
  - [ ] Mensagem de sucesso aparece

#### 3.3 Desativar/Ativar Quadra
- [ ] **Alterar status de uma quadra**
  - [ ] Quadra inativa não aparece para agendamento
  - [ ] Quadra ativa aparece normalmente

---

### 4. 📅 Sistema de Reservas

#### 4.1 Criar Reserva (Via Admin)
- [ ] **Acessar `/agendamentos` → "Nova Reserva"**
  - [ ] Modal/formulário abre
  - [ ] Seleção de quadra funciona
  - [ ] Seleção de data funciona (calendário)
  - [ ] Seleção de horário funciona
  - [ ] Campos obrigatórios: nome do cliente, telefone
  - [ ] Validação de telefone (DDD + número)
  - [ ] Seleção de status de pagamento (pago/pendente/sinal)
  - [ ] Reserva é criada com sucesso
  - [ ] Reserva aparece no calendário/lista

#### 4.2 Link Público de Agendamento
- [ ] **Acessar `/agendar/:subdomain` (subdomain do seu tenant)**
  - [ ] Página pública carrega corretamente
  - [ ] Nome da empresa aparece
  - [ ] Lista de quadras disponíveis aparece
  - [ ] Seleção de quadra funciona

#### 4.3 Visualização de Horários Disponíveis
- [ ] **Na página pública `/agendar/:subdomain`**
  - [ ] Selecionar uma quadra
  - [ ] Calendário mostra datas disponíveis
  - [ ] Horários disponíveis aparecem corretamente
  - [ ] Horários já ocupados aparecem desabilitados/cinza
  - [ ] Seleção de horário funciona
  - [ ] Formulário de dados do cliente aparece

#### 4.4 Criar Reserva (Via Público)
- [ ] **Preencher formulário público e criar reserva**
  - [ ] Campos obrigatórios: nome, telefone
  - [ ] Validação de telefone funciona
  - [ ] Reserva é criada com sucesso
  - [ ] Mensagem de confirmação aparece

#### 4.5 Confirmação por WhatsApp
- [ ] **Após criar reserva via público ou admin**
  - [ ] Link do WhatsApp é gerado corretamente
  - [ ] Mensagem pré-formatada contém:
    - [ ] Nome do cliente
    - [ ] Data e horário
    - [ ] Nome da quadra
    - [ ] Informações de contato (se aplicável)
  - [ ] Link abre WhatsApp Web/App corretamente
  - [ ] Caracteres especiais (acentos, etc) aparecem corretamente

#### 4.6 Ver Reserva no Dashboard (Admin)
- [ ] **Após criar reserva (pública ou admin)**
  - [ ] Reserva aparece na lista de agendamentos
  - [ ] Reserva aparece no calendário (se houver)
  - [ ] Informações da reserva estão corretas

#### 4.7 Editar Reserva
- [ ] **Clicar em "Editar" em uma reserva**
  - [ ] Formulário preenchido com dados atuais
  - [ ] Alterações de data/hora funcionam
  - [ ] Alterações são salvas
  - [ ] Mensagem de sucesso aparece

#### 4.8 Cancelar Reserva
- [ ] **Clicar em "Cancelar" em uma reserva**
  - [ ] Modal de confirmação aparece
  - [ ] Confirmação cancela a reserva
  - [ ] Reserva desaparece da lista/calendário

---

### 5. 💳 Billing e Assinaturas

#### 5.1 Acesso às Configurações de Billing
- [ ] **Acessar `/configuracoes` → Aba "Assinatura"**
  - [ ] Status atual da assinatura aparece (Trial/Ativo)
  - [ ] Data de expiração do trial aparece (se em trial)
  - [ ] Botão de "Assinar" ou "Atualizar Plano" aparece

#### 5.2 Seleção de Plano
- [ ] **Clicar em "Assinar" ou "Atualizar Plano"**
  - [ ] Modal com planos (Start/Pro) aparece
  - [ ] Informações de cada plano estão corretas
  - [ ] Seleção de intervalo (mensal/anual) funciona
  - [ ] Validação: CPF/CNPJ preenchido (requerido)
  - [ ] Botão "Continuar para Pagamento" funciona

#### 5.3 Checkout
- [ ] **Após selecionar plano**
  - [ ] Redirecionamento para checkout do Asaas funciona
  - [ ] URL do checkout é válida (sandbox ou produção)
  - [ ] Página de pagamento carrega
  - [ ] **Nota:** Pagamento real não é necessário em sandbox para testar o fluxo

#### 5.4 Bloqueio Após Trial Expirar
- [ ] **Simular expiração do trial** (pode requerer ajuste manual no banco)
  - [ ] Mensagem de bloqueio aparece
  - [ ] Acesso às funcionalidades é bloqueado
  - [ ] Link para assinatura está disponível
  - [ ] Mensagem é clara e objetiva

---

### 6. 📱 Responsividade e Mobile

#### 6.1 Mobile (< 768px)
- [ ] **Testar em dispositivo móvel ou DevTools (mobile view)**
  - [ ] Dashboard se adapta ao tamanho da tela
  - [ ] Menu lateral vira hamburger menu (se aplicável)
  - [ ] Formulários são utilizáveis
  - [ ] Botões têm tamanho adequado para toque
  - [ ] Texto é legível (não muito pequeno)
  - [ ] Calendário funciona em mobile

#### 6.2 Tablet (768px - 1024px)
- [ ] **Testar em tablet ou DevTools**
  - [ ] Layout se adapta corretamente
  - [ ] Navegação funciona
  - [ ] Formulários são utilizáveis

#### 6.3 Desktop (> 1024px)
- [ ] **Testar em desktop**
  - [ ] Layout utiliza espaço disponível
  - [ ] Navegação lateral funciona
  - [ ] Elementos não ficam muito espaçados

---

### 7. 🔔 Mensagens e Feedback

#### 7.1 Mensagens de Sucesso
- [ ] **Após criar/editar/deletar**
  - [ ] Toast/notificação aparece
  - [ ] Mensagem é clara ("Reserva criada com sucesso!")
  - [ ] Mensagem desaparece automaticamente

#### 7.2 Mensagens de Erro
- [ ] **Testar campos inválidos, erros de API, etc**
  - [ ] Mensagens de erro são claras
  - [ ] Mensagens aparecem no local correto (campo ou toast)
  - [ ] Mensagens são em português
  - [ ] Mensagens não são técnicas demais para o usuário final

#### 7.3 Loading States
- [ ] **Durante operações assíncronas**
  - [ ] Spinner ou loading aparece
  - [ ] Botões ficam desabilitados durante loading
  - [ ] Loading some após conclusão

---

### 8. 🔒 Segurança e Permissões

#### 8.1 Acesso Sem Autenticação
- [ ] **Tentar acessar rotas protegidas sem login**
  - [ ] Redirecionamento para `/login`
  - [ ] Mensagem apropriada aparece

#### 8.2 Isolamento Multi-Tenant (Validação Visual)
- [ ] **Criar dois tenants diferentes e validar**
  - [ ] Tenant A não vê dados do Tenant B
  - [ ] Reservas aparecem apenas do tenant logado
  - [ ] Calendário público mostra apenas do subdomain correto

---

### 9. 🧪 Cenários de Erro

#### 9.1 Erros de Rede
- [ ] **Simular conexão lenta ou offline (DevTools)**
  - [ ] Mensagem de erro adequada
  - [ ] Aplicação não quebra
  - [ ] Possibilidade de tentar novamente

#### 9.2 Dados Inválidos
- [ ] **Testar com dados inválidos em formulários**
  - [ ] Validação previne envio
  - [ ] Mensagens de erro são claras

---

## 📊 Checklist Rápido (Prioridade Alta)

Se você tiver tempo limitado, priorize estes testes:

- [ ] **Cadastro completo** (Login → Onboarding → Dashboard)
- [ ] **Criação de quadra** (via admin)
- [ ] **Criação de reserva** (via admin)
- [ ] **Link público** (`/agendar/:subdomain`) funciona
- [ ] **Reserva via público** funciona
- [ ] **WhatsApp** - Link gerado e mensagem formatada
- [ ] **Responsividade mobile** básica
- [ ] **Checkout de assinatura** (até redirecionamento)

---

## 📝 Como Reportar Problemas

Ao encontrar problemas durante os testes, anote:

1. **O que você estava fazendo?**
   - Ex: "Criando uma nova reserva via admin"

2. **O que aconteceu?**
   - Ex: "Erro 500 ao salvar reserva"

3. **O que era esperado?**
   - Ex: "Reserva deveria ser salva e aparecer na lista"

4. **Screenshot** (se possível)

5. **Console do navegador** (F12 → Console) - anotar erros

---

## ✅ Próximos Passos Após Testes Manuais

Após completar os testes manuais, você pode:

1. **Corrigir bugs encontrados**
2. **Implementar melhorias de UX**
3. **Criar testes de performance** (`test:performance`)
4. **Preparar para produção**

---

**Boa sorte nos testes! 🚀**
