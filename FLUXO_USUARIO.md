# Fluxo do Usuário - Arena Sports

## Visão Geral

Este documento consolida o fluxo real do usuário no Arena Sports, incluindo correções e melhorias implementadas no onboarding.

## Fluxo de Cadastro e Onboarding

### 1. Cadastro Inicial

- Usuário acessa landing page
- Clica em "Começar Agora"
- Preenche email e senha
- Recebe confirmação por email

### 2. Configuração Inicial (Welcome Screen)

- Após login, usuário é direcionado para tela de boas-vindas
- Campos obrigatórios:
  - Nome da arena
  - Endereço
  - Telefone
  - CPF/CNPJ (para Asaas)
- Configuração de quadras iniciais

### 3. Dashboard Principal

- Visualização da agenda semanal
- Gestão de reservas
- Configurações de preço por horário
- Relatórios básicos

## Fluxo de Reserva (Cliente)

### 1. Acesso Público

- Cliente acessa link público da arena (subdomínio)
- Visualiza horários disponíveis
- Seleciona data e horário desejado

### 2. Reserva

- Preenche dados pessoais
- Confirma reserva
- Recebe confirmação por WhatsApp

### 3. Pagamento

- Atualmente: pagamento no local
- Futuro: integração Asaas para pagamento online

## Correções Implementadas

### Onboarding Corrigido

- **Problema anterior**: Usuário ficava preso na tela de welcome sem conseguir avançar
- **Solução**: Implementação de validação completa dos campos obrigatórios
- **Melhoria**: Adição de CPF/CNPJ obrigatório para compliance Asaas

### Autenticação

- **Tratamento de refresh token inválido**: Logout automático e redirecionamento
- **Persistência de sessão**: Manutenção do estado de login

## Estados do Sistema

### Estados do Usuário

- `authenticated`: Logado e ativo
- `onboarding`: Primeiro acesso, precisa completar welcome
- `active`: Usuário completo, pode usar o sistema

### Estados da Reserva

- `pending`: Aguardando confirmação
- `confirmed`: Confirmada, aguardando pagamento
- `paid`: Paga e finalizada
- `cancelled`: Cancelada

## Próximas Melhorias

- Implementar pagamento online via Asaas
- Adicionar notificações push
- Melhorar UX do onboarding
- Implementar recuperação de senha
