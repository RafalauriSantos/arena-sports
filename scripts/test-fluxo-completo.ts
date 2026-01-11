#!/usr/bin/env bun

/**
 * 🧪 TESTE DE FLUXO COMPLETO - Cadastro → Onboarding → Billing
 * Simula o fluxo completo do usuário para validar integração
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import type { User } from '@supabase/supabase-js'

config()

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
  arena_id?: string
  [key: string]: unknown
}

interface SubscriptionData {
  checkout_url?: string
  subscription_id?: string
  [key: string]: unknown
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

// =============================================================================
// 🧪 SIMULAÇÃO: Cadastro de Novo Usuário
// =============================================================================

async function simulateUserSignup(): Promise<TestUser | null> {
  console.log('📝 Simulando cadastro de novo usuário...')

  const testEmail = `fluxo-completo-${Date.now()}@example.com`
  const testPassword = 'test123456'

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })

    if (error) throw error

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
      name: 'Arena Teste Fluxo Completo',
      address: 'Rua Teste, 123',
      phone: '(11) 99999-9999',
      cpf_cnpj: '12.345.678/0001-99' // CPF/CNPJ válido para Asaas
    }

    // Verificar se a função fn_onboard_user existe e funciona
    const { data, error } = await supabase.rpc('fn_onboard_user', {
      user_id: user.user?.id,
      arena_name: onboardingData.name,
      arena_address: onboardingData.address,
      arena_phone: onboardingData.phone,
      cpf_cnpj: onboardingData.cpf_cnpj
    })

    if (error) throw error

    console.log('✅ Onboarding completado via fn_onboard_user')
    console.log('📊 Tenant criado com ID:', data?.tenant_id)

    return data as TenantData

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
    // Preparar dados para checkout
    const checkoutData = {
      tenant_id: tenantData.tenant_id,
      plan_id: 'starter', // ou o plano que estiver disponível
      success_url: 'http://localhost:5173/success',
      cancel_url: 'http://localhost:5173/cancel'
    }

    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('asaas-create-checkout', {
      body: checkoutData
    })

    if (error) throw error

    console.log('✅ Checkout Asaas criado')
    console.log('🔗 URL de pagamento:', data?.checkout_url)
    console.log('🆔 Subscription ID:', data?.subscription_id)

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
        subscription: subscriptionData?.subscription_id,
        value: 97.00,
        netValue: 94.09,
        status: 'RECEIVED'
      }
    }

    // Chamar Edge Function do webhook
    const { data, error } = await supabase.functions.invoke('asaas-webhook', {
      body: webhookPayload
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