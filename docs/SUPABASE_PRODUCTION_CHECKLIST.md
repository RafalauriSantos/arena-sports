# Supabase Production Checklist - ArenaSys

Ultima atualizacao: 2026-04-04
Contexto atual: projeto usando plano gratis do Supabase, sem SMTP customizado.

Este checklist transforma as recomendacoes oficiais em passos executaveis para o ArenaSys.

## 1) Seguranca (obrigatorio)

## 1.1 RLS e politicas

- [ ] Confirmar RLS habilitado em 100% das tabelas com dados de produto.
- [ ] Revisar politicas para garantir isolamento por tenant.
- [ ] Verificar tabelas em publicacoes de replicacao e evitar expor dados sensiveis sem RLS/politica adequada.

Caminhos no painel:

- Database > Tables
- Authentication > Policies
- Database > Publications

## 1.2 Acesso e conta

- [ ] Ativar MFA na conta da organizacao Supabase.
- [ ] Ativar 2FA no GitHub da conta dona da org.
- [ ] Garantir pelo menos 2 owners na organizacao.

Caminhos no painel:

- Organization > Team
- Account settings (MFA)

## 1.3 Auth hardening

- [ ] Confirmar email confirmation habilitado.
- [ ] Configurar expiracao de OTP para 3600s (ou menor).
- [ ] Revisar necessidade de MFA para usuarios finais.

Caminhos no painel:

- Authentication > Providers

## 1.4 Infra

- [ ] Habilitar SSL Enforcement.
- [ ] Revisar Network Restrictions para banco.

Caminhos no painel:

- Database > Settings > SSL Configuration
- Database > Settings > Network Restrictions

## 2) Performance (obrigatorio)

- [ ] Rodar Security Advisor e corrigir achados.
- [ ] Rodar Performance Advisor e corrigir achados.
- [ ] Revisar indices das queries mais usadas.
- [ ] Medir queries lentas com pg_stat_statements.
- [ ] Executar carga em staging (k6 ou equivalente).

Caminhos no painel:

- Advisors > Security
- Advisors > Performance

## 3) Disponibilidade e continuidade

## 3.1 Emails transacionais

- [ ] Planejar migracao para SMTP proprio (SendGrid/SES/Postmark/Resend) quando houver crescimento.
- [ ] Validar templates de email para evitar quebra por link tracking.

Caminhos no painel:

- Authentication > Emails > SMTP Settings

## 3.2 Backup e recuperacao

- [ ] Se banco ultrapassar 4 GB, habilitar PITR.
- [ ] Definir estrategia de recuperacao (RPO/RTO) minima do negocio.

Caminhos no painel:

- Settings > Add-ons (PITR)

## 4) Rate limits e abuso (critico para seu caso)

## 4.1 Limites relevantes no plano atual

- Emails de auth (signup/recover/user): limite combinado restritivo no setup sem SMTP customizado.
- Password reset por usuario: janela de cooldown (padrao 60s) pode ser ajustada.
- Verificacao/token tambem possuem limites por IP.

## 4.2 Acoes no app (ArenaSys)

- [x] UX de recovery com mensagem amigavel para rate limit.
- [x] Cooldown visual no botao de recovery para reduzir tentativas repetidas.
- [ ] Adicionar observabilidade basica de erros de auth (contagem por tipo).
- [ ] Criar runbook curto: "rate limit exceeded" para suporte interno.

## 4.3 Acoes no painel

- [ ] Revisar Authentication > Rate Limits e documentar valores reais usados no projeto.
- [ ] Considerar CAPTCHA em signin/signup/recovery.

## 5) Pre-deploy para producao (passo a passo)

1. Rodar testes principais no projeto.
2. Validar login, cadastro, recuperacao de senha e agendamento.
3. Confirmar variaveis de ambiente e secrets.
4. Revisar Security/Performance Advisor.
5. Deploy e smoke test em producao.

## 6) Decisao por fase (recomendado)

## Fase atual (plano gratis)

- Manter cooldown de recovery e mensagens claras.
- Evitar campanhas que gerem pico de emails de auth.
- Monitorar erros de auth e volume de tentativas.

## Proxima fase (escala)

- Migrar para SMTP customizado.
- Revisar limites para lancamentos/campanhas.
- Considerar Pro para suporte e resiliencia operacional.
