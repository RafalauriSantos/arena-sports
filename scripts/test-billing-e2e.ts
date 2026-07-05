
/**
 * 💳 TESTE END-TO-END - Billing Completo
 * Testa o fluxo completo de checkout e webhook do Asaas
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Carregar variáveis de ambiente
const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : existsSync(resolve(process.cwd(), '.env'))
  ? '.env'
  : null
if (envFile) {
  config({ path: envFile })
}

console.log('💳 TESTE END-TO-END - BILLING\n')
console.log('='.repeat(70))

type TestResult = {
  name: string
  passed: boolean
  message?: string
  severity?: 'critical' | 'high' | 'medium'
}

const results: TestResult[] = []

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Erro desconhecido'
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY é obrigatório para este teste')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// IDs de teste para limpeza
let testTenantId: string | null = null
let testUserId: string | null = null
let testSubscriptionId: string | null = null

// =============================================================================
// 🧹 LIMPEZA
// =============================================================================

async function cleanup() {
  if (!supabaseAdmin) return

  try {
    // Deletar subscription de teste
    if (testSubscriptionId) {
      await supabaseAdmin
        .from('tenant_subscriptions')
        .delete()
        .eq('tenant_id', testTenantId)
    }

    // Deletar usuário de teste (cascade deleta profile)
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId)
    }

    // Deletar tenant de teste (cascade deleta relacionamentos)
    if (testTenantId) {
      await supabaseAdmin
        .from('tenants')
        .delete()
        .eq('id', testTenantId)
    }
  } catch (error) {
    console.log(`   ⚠️  Erro na limpeza: ${getErrorMessage(error)}`)
  }
}

// =============================================================================
// 🧪 TESTE 1: Checkout Completo
// =============================================================================

async function testCheckoutComplete(): Promise<TestResult[]> {
  console.log('\n💳 1. Testando Checkout Completo')
  console.log('-'.repeat(70))

  const testResults: TestResult[] = []

  try {
    // Criar usuário de teste
    const testEmail = `test-billing-${Date.now()}@example.com`
    const testPassword = 'Test123456!'

    console.log('   📦 Criando usuário de teste...')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (userError || !userData.user) {
      testResults.push({
        name: 'Criação Usuário Teste',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(userError)
      })
      return testResults
    }

    testUserId = userData.user.id
    console.log(`   ✅ Usuário criado: ${testUserId}`)

    // Criar tenant de teste
    console.log('   📦 Criando tenant de teste...')
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        business_name: `Test Billing ${Date.now()}`,
        subdomain: `test-billing-${Date.now()}`,
        owner_id: testUserId
      })
      .select()
      .single()

    if (tenantError || !tenantData) {
      testResults.push({
        name: 'Criação Tenant Teste',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(tenantError)
      })
      return testResults
    }

    testTenantId = tenantData.id
    console.log(`   ✅ Tenant criado: ${testTenantId}`)

    // Criar profile com CPF/CNPJ e telefone (obrigatórios para Asaas)
    // CPF válido para testes: deve ter dígito verificador correto
    // CPF válido: 11144477735 (gera dígitos verificadores válidos: 35)
    console.log('   📦 Criando profile com dados cadastrais...')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: testUserId,
        tenant_id: testTenantId,
        email: testEmail,
        full_name: 'Teste Billing',
        cpf_cnpj: '11144477735', // CPF válido para testes (dígitos verificadores: 35)
        whatsapp: '11987654321' // Telefone válido (11 dígitos)
      })

    if (profileError) {
      testResults.push({
        name: 'Criação Profile com CPF/Telefone',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(profileError)
      })
      return testResults
    }

    console.log('   ✅ Profile criado com CPF e telefone')

    // Fazer login para obter access token
    console.log('   🔐 Fazendo login...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    })

    if (signInError || !signInData.session) {
      testResults.push({
        name: 'Login para Checkout',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(signInError)
      })
      return testResults
    }

    const accessToken = signInData.session.access_token
    console.log('   ✅ Login realizado')

    // Chamar Edge Function de checkout
    console.log('   📞 Chamando asaas-create-checkout...')
    const checkoutUrl = `${supabaseUrl}/functions/v1/asaas-create-checkout`
    
    const checkoutResponse = await fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_code: 'start',
        interval: 'month'
      })
    })

    const checkoutData = await checkoutResponse.json()

    if (!checkoutResponse.ok) {
      testResults.push({
        name: 'Checkout - Criação',
        passed: false,
        severity: 'critical',
        message: `Status ${checkoutResponse.status}: ${checkoutData.error || JSON.stringify(checkoutData)}`
      })
      console.log(`   ❌ Checkout falhou: ${checkoutData.error || JSON.stringify(checkoutData)}`)
      return testResults
    }

    // Verificar se URL foi retornada
    if (!checkoutData.url) {
      testResults.push({
        name: 'Checkout - URL Retornada',
        passed: false,
        severity: 'critical',
        message: 'Checkout não retornou URL'
      })
      console.log('   ❌ Checkout não retornou URL')
      return testResults
    }

    // Verificar se URL é válida
    if (!checkoutData.url.startsWith('http://') && !checkoutData.url.startsWith('https://')) {
      testResults.push({
        name: 'Checkout - URL Válida',
        passed: false,
        severity: 'high',
        message: `URL inválida: ${checkoutData.url}`
      })
      console.log(`   ❌ URL inválida: ${checkoutData.url}`)
    } else {
      testResults.push({
        name: 'Checkout - URL Válida',
        passed: true,
        severity: 'critical',
        message: `URL retornada: ${checkoutData.url.substring(0, 50)}...`
      })
      console.log(`   ✅ URL de checkout retornada: ${checkoutData.url.substring(0, 60)}...`)
    }

    // Verificar se subscriptionId foi retornado
    if (!checkoutData.subscriptionId) {
      testResults.push({
        name: 'Checkout - Subscription ID',
        passed: false,
        severity: 'high',
        message: 'Subscription ID não foi retornado'
      })
      console.log('   ⚠️  Subscription ID não foi retornado')
    } else {
      testSubscriptionId = checkoutData.subscriptionId
      testResults.push({
        name: 'Checkout - Subscription ID',
        passed: true,
        severity: 'critical',
        message: `Subscription ID: ${checkoutData.subscriptionId}`
      })
      console.log(`   ✅ Subscription ID retornado: ${checkoutData.subscriptionId}`)
    }

    // Verificar se tenant_subscription foi criado/atualizado
    const { data: subscriptionData, error: subError } = await supabaseAdmin
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', testTenantId)
      .single()

    if (subError || !subscriptionData) {
      testResults.push({
        name: 'Checkout - Subscription no Banco',
        passed: false,
        severity: 'critical',
        message: 'Subscription não foi salva no banco'
      })
      console.log(`   ❌ Subscription não encontrada no banco: ${getErrorMessage(subError)}`)
    } else {
      testResults.push({
        name: 'Checkout - Subscription no Banco',
        passed: true,
        severity: 'critical',
        message: `Status: ${subscriptionData.status}, Plano: ${subscriptionData.plan_code}`
      })
      console.log(`   ✅ Subscription salva no banco (status: ${subscriptionData.status})`)
    }

  } catch (error) {
    testResults.push({
      name: 'Checkout - Erro Geral',
      passed: false,
      severity: 'critical',
      message: getErrorMessage(error)
    })
    console.log(`   ❌ Erro: ${getErrorMessage(error)}`)
  }

  return testResults
}

// =============================================================================
// 🧪 TESTE 2: Simulação de Webhook
// =============================================================================

async function testWebhookSimulation(): Promise<TestResult[]> {
  console.log('\n🔔 2. Testando Simulação de Webhook')
  console.log('-'.repeat(70))

  const testResults: TestResult[] = []

  if (!testTenantId) {
    testResults.push({
      name: 'Webhook - Tenant Teste',
      passed: false,
      severity: 'high',
      message: 'Tenant de teste não foi criado'
    })
    return testResults
  }

  try {
    // Buscar subscription no banco para obter IDs necessários
    const { data: subscriptionData, error: subError } = await supabaseAdmin
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', testTenantId)
      .single()

    if (subError || !subscriptionData || !subscriptionData.asaas_subscription_id) {
      testResults.push({
        name: 'Webhook - Buscar Subscription',
        passed: false,
        severity: 'high',
        message: 'Subscription não encontrada para simular webhook'
      })
      console.log('   ⚠️  Subscription não encontrada para simular webhook')
      return testResults
    }

    const subscriptionId = subscriptionData.asaas_subscription_id
    const customerId = subscriptionData.asaas_customer_id

    // Simular evento PAYMENT_CONFIRMED do Asaas
    const webhookPayload = {
      event: 'PAYMENT_CONFIRMED',
      payment: {
        id: `pay_test_${Date.now()}`,
        customer: customerId,
        subscription: subscriptionId,
        value: 69.9,
        netValue: 69.9,
        status: 'CONFIRMED',
        billingType: 'UNDEFINED'
      },
      subscription: {
        id: subscriptionId
      }
    }

    console.log('   📤 Enviando webhook simulado...')
    const webhookUrl = `${supabaseUrl}/functions/v1/asaas-webhook`
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    })

    const webhookData = await webhookResponse.json()

    if (!webhookResponse.ok) {
      testResults.push({
        name: 'Webhook - Processamento',
        passed: false,
        severity: 'high',
        message: `Status ${webhookResponse.status}: ${webhookData.error || JSON.stringify(webhookData)}`
      })
      console.log(`   ❌ Webhook falhou: ${webhookData.error || JSON.stringify(webhookData)}`)
      return testResults
    }

    testResults.push({
      name: 'Webhook - Processamento',
      passed: true,
      severity: 'critical',
      message: 'Webhook processado com sucesso'
    })
    console.log('   ✅ Webhook processado')

    // Aguardar um pouco para garantir que o processamento terminou
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Verificar se o status foi atualizado no banco
    const { data: updatedSubscription, error: updateCheckError } = await supabaseAdmin
      .from('tenant_subscriptions')
      .select('status')
      .eq('tenant_id', testTenantId)
      .single()

    if (updateCheckError) {
      testResults.push({
        name: 'Webhook - Atualização de Status',
        passed: false,
        severity: 'critical',
        message: `Erro ao verificar status: ${getErrorMessage(updateCheckError)}`
      })
      console.log(`   ❌ Erro ao verificar status: ${getErrorMessage(updateCheckError)}`)
    } else {
      const statusUpdated = updatedSubscription?.status === 'active' || updatedSubscription?.status === 'paid'
      testResults.push({
        name: 'Webhook - Atualização de Status',
        passed: statusUpdated,
        severity: 'critical',
        message: `Status atual: ${updatedSubscription?.status || 'null'} (esperado: active/paid)`
      })
      if (statusUpdated) {
        console.log(`   ✅ Status atualizado para: ${updatedSubscription?.status}`)
      } else {
        console.log(`   ⚠️  Status não foi atualizado para active/paid (atual: ${updatedSubscription?.status})`)
      }
    }

  } catch (error) {
    testResults.push({
      name: 'Webhook - Erro Geral',
      passed: false,
      severity: 'high',
      message: getErrorMessage(error)
    })
    console.log(`   ❌ Erro: ${getErrorMessage(error)}`)
  }

  return testResults
}

// =============================================================================
// 🎯 EXECUÇÃO PRINCIPAL
// =============================================================================

async function runAllTests() {
  try {
    console.log('\n💳 Iniciando testes de billing end-to-end...\n')

    // Executar testes
    const checkoutResults = await testCheckoutComplete()
    results.push(...checkoutResults)

    const webhookResults = await testWebhookSimulation()
    results.push(...webhookResults)

    // Resumo final
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESUMO DOS TESTES DE BILLING\n')

    const passed = results.filter(r => r.passed).length
    const total = results.length
    const critical = results.filter(r => r.severity === 'critical')
    const criticalPassed = critical.filter(r => r.passed).length

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      const severity = result.severity ? `[${result.severity.toUpperCase()}]` : ''
      console.log(`   ${icon} ${severity} ${result.name}${result.message ? `: ${result.message}` : ''}`)
    })

    console.log(`\n${'='.repeat(70)}`)
    console.log(`📈 TOTAL: ${passed}/${total} testes passaram`)
    console.log(`🔴 CRÍTICOS: ${criticalPassed}/${critical.length} passaram\n`)

    if (passed === total && criticalPassed === critical.length) {
      console.log('🎉 TODOS OS TESTES DE BILLING PASSARAM!')
      console.log('✅ Fluxo de billing está funcionando corretamente.\n')
      await cleanup()
      process.exit(0)
    } else {
      const criticalFailed = critical.filter(r => !r.passed)
      if (criticalFailed.length > 0) {
        console.log('🚨 FALHAS CRÍTICAS DETECTADAS!')
        console.log('❌ Corrija os problemas críticos antes de ir para produção.\n')
      } else {
        console.log('⚠️  ALGUNS TESTES FALHARAM')
        console.log('💡 Revise os problemas antes de ir para produção.\n')
      }
      await cleanup()
      process.exit(1)
    }
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('\n❌ Erro fatal:', message)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    await cleanup()
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (import.meta.main) {
  runAllTests()
}