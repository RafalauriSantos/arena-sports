#!/usr/bin/env bun

/**
 * 🧪 TESTE DE FLUXO COMPLETO - Cadastro → Onboarding → Billing
 * Simula o fluxo completo do usuário para validar integração
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
import type { User } from '@supabase/supabase-js'

const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : '.env'
config({ path: envFile })

// =============================================================================
// 🏗️ TIPOS E INTERFACES
// =============================================================================

interface TestUser {
  user: User | null
  email: string
  password: string
}

interface TenantData {
  tenant_id: string
}

interface SubscriptionData {
  url?: string
  subscriptionId?: string
}

interface WebhookPayload {
  event: string
  payment: {
    id: string
    subscription?: string
    value: number
    netValue: number
    status: string
  }
}

// =============================================================================
// 🗄️ CONFIGURAÇÃO DO SUPABASE
// =============================================================================

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('🚀 Teste de Fluxo Completo - Cadastro → Onboarding → Billing\n')

const isEmailConfirmationError = (message: string) =>
  /confirm|confirmation|email not confirmed/i.test(message)

const isSignupRestricted = (message: string) =>
  /sign.?up.*(disabled|not allowed|invite)|email.*invalid/i.test(message)

const testEmailDomain = process.env.TEST_EMAIL_DOMAIN || 'example.com'

// =============================================================================
// 🧪 SIMULAÇÃO: Cadastro de Novo Usuário
// =============================================================================

async function simulateUserSignup(): Promise<TestUser | null> {
  console.log('📝 Simulando cadastro de novo usuário...')

  const testEmail = `fluxo-completo-${Date.now()}@${testEmailDomain}`
  const testPassword = 'test123456'

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    if (error) {
      if (isSignupRestricted(error.message)) {
        console.log(
          '⚠️ Signup bloqueado por política do projeto. Defina TEST_EMAIL_DOMAIN ou habilite signups.'
        )
        return null
      }
      throw error
    }
    const { error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signinError) {
      if (isEmailConfirmationError(signinError.message)) {
        console.log('⚠️ Email não confirmado. Encerrando fluxo de teste.')
        return null
      }
      throw signinError
    }

    console.log(`✅ Usuário criado: ${testEmail}`)
    return { user: data.user, email: testEmail, password: testPassword }

  } catch (error) {
    console.log('❌ Erro no cadastro:', error instanceof Error ? error.message : String(error))
    return null
  }
}

// =============================================================================
// 🧪 SIMULAÇÃO: Onboarding (Welcome Screen)
// =============================================================================

async function simulateOnboarding(user: TestUser): Promise<TenantData | null> {
  console.log('🏠 Simulando onboarding...')

  try {
    // Simular preenchimento do welcome
    const onboardingData = {
      businessName: 'Arena Teste Fluxo Completo',
      saasSlug: 'arena-sys'
    }

    // Verificar se a função fn_onboard_user existe e funciona
    const { data, error } = await supabase.rpc('fn_onboard_user', {
      p_business_name: onboardingData.businessName,
      p_saas_slug: onboardingData.saasSlug
    })

    if (error) throw error

    console.log('✅ Onboarding completado via fn_onboard_user')
    console.log('📊 Tenant criado com ID:', data)

    return { tenant_id: data as string }

  } catch (error) {
    console.log('❌ Erro no onboarding:', error instanceof Error ? error.message : String(error))
    return null
  }
}

// =============================================================================
// 🧪 SIMULAÇÃO: Checkout Asaas
// =============================================================================

async function simulateAsaasCheckout(user: TestUser, tenantData: TenantData): Promise<SubscriptionData | null> {
  console.log('💳 Simulando checkout Asaas...')

  try {
    const shouldRunAsaas = /^(1|true|yes)$/i.test(process.env.RUN_ASAAS_TESTS ?? '')
    if (!shouldRunAsaas) {
      console.log('⚠️ Teste de checkout Asaas ignorado (RUN_ASAAS_TESTS=1 para habilitar)')
      return null
    }

    const cpfCnpj = process.env.TEST_ASAAS_CPF_CNPJ
    const phone = process.env.TEST_ASAAS_PHONE

    if (!cpfCnpj || !phone) {
      console.log('⚠️ TEST_ASAAS_CPF_CNPJ/TEST_ASAAS_PHONE ausentes. Pulando checkout.')
      return null
    }

    // Preparar dados para checkout
    const checkoutData = {
      tenant_id: tenantData.tenant_id,
      plan_code: 'start',
      interval: 'month',
      customer: {
        name: user.email.split('@')[0],
        email: user.email,
        cpfCnpj,
        phone
      }
    }

    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('asaas-create-checkout', {
      body: checkoutData
    })

    if (error) throw error

    console.log('✅ Checkout Asaas criado')
    console.log('🔗 URL de pagamento:', data?.url)
    console.log('🆔 Subscription ID:', data?.subscriptionId)

    return data as SubscriptionData

  } catch (error) {
    console.log('❌ Erro no checkout Asaas:', error instanceof Error ? error.message : String(error))
    console.log('💡 Possível causa: Asaas API key não configurada ou plano inválido')
    return null
  }
}

// =============================================================================
// 🧪 SIMULAÇÃO: Webhook Asaas (Pagamento Aprovado)
// =============================================================================

async function simulateWebhook(tenantData: TenantData, subscriptionData: SubscriptionData): Promise<unknown> {
  console.log('🔗 Simulando webhook de pagamento aprovado...')

  try {
    // Simular payload do webhook Asaas
    const webhookPayload: WebhookPayload = {
      event: 'PAYMENT_RECEIVED',
      payment: {
        id: `pay_${Date.now()}`,
        subscription: subscriptionData?.subscriptionId,
        value: 97.00,
        netValue: 94.09,
        status: 'RECEIVED'
      }
    }

    // Chamar Edge Function do webhook
    const webhookToken =
      process.env.TEST_ASAAS_WEBHOOK_TOKEN ||
      process.env.ASAAS_WEBHOOK_SECRET ||
      process.env.ASAAS_WEBHOOK_TOKEN

    const { data, error } = await supabase.functions.invoke('asaas-webhook', {
      body: webhookPayload,
      headers: webhookToken ? { 'asaas-access-token': webhookToken } : undefined
    })

    if (error) throw error

    console.log('✅ Webhook processado com sucesso')
    console.log('📊 Subscription ativada para tenant:', tenantData.tenant_id)

    return data

  } catch (error) {
    console.log('❌ Erro no webhook:', error instanceof Error ? error.message : String(error))
    return null
  }
}

// =============================================================================
// 🧪 VERIFICAÇÃO: Status Final do Tenant
// =============================================================================

async function verifyFinalState(tenantData: TenantData): Promise<boolean> {
  console.log('🔍 Verificando status final do tenant...')

  try {
    // Verificar subscription
    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', tenantData.tenant_id)
      .single()

    if (subError) throw subError

    console.log('📊 Status da subscription:', subscription.status)

    if (subscription.status === 'active') {
      console.log('✅ Tenant ativado com sucesso!')
      return true
    } else {
      console.log('⚠️ Subscription ainda não ativa')
      return false
    }

  } catch (error) {
    console.log('❌ Erro na verificação:', error instanceof Error ? error.message : String(error))
    return false
  }
}

// =============================================================================
// 🎯 EXECUÇÃO DO FLUXO COMPLETO
// =============================================================================

async function runCompleteFlowTest(): Promise<void> {
  console.log('🎯 EXECUTANDO TESTE DE FLUXO COMPLETO\n')
  console.log('=' .repeat(60))

  let user: TestUser | null = null
  let tenantData: TenantData | null = null
  let subscriptionData: SubscriptionData | null = null

  try {
    // 1. Cadastro
    user = await simulateUserSignup()
    if (!user) return

    // 2. Onboarding
    tenantData = await simulateOnboarding(user)
    if (!tenantData) return

    // 3. Checkout (pode falhar se Asaas não estiver configurado)
    subscriptionData = await simulateAsaasCheckout(user, tenantData)

    // 4. Webhook (só se checkout funcionou)
    if (subscriptionData) {
      await simulateWebhook(tenantData, subscriptionData)
    }

    // 5. Verificação final
    const success = await verifyFinalState(tenantData)

    console.log('\n' + '=' .repeat(60))
    console.log('📊 RESULTADO DO FLUXO COMPLETO:')

    if (success) {
      console.log('🎉 FLUXO COMPLETO FUNCIONANDO! Sistema pronto para produção.')
    } else {
      console.log('⚠️ Fluxo parcialmente funcional. Verificar Asaas integration.')
    }

  } catch (error) {
    console.log('💥 ERRO CRÍTICO no fluxo:', error instanceof Error ? error.message : String(error))
  }

  console.log('\n💡 NOTAS PARA AMANHÃ:')
  console.log('1. Verificar configuração das secrets do Asaas')
  console.log('2. Testar manualmente no navegador')
  console.log('3. Verificar logs das Edge Functions')
  console.log('4. Configurar domínio de produção')
}

// Executar se chamado diretamente
if (import.meta.main) {
  runCompleteFlowTest().catch(console.error)
}

export { runCompleteFlowTest }