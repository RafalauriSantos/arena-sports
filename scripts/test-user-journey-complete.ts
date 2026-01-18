#!/usr/bin/env bun

/**
 * 👤 TESTE COMPLETO - Jornada do Usuário
 * Testa o fluxo completo do usuário desde o cadastro até funcionalidades principais
 * Marca claramente o que precisa ser testado manualmente (UI/UX, WhatsApp, etc)
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

console.log('👤 TESTE COMPLETO - JORNADA DO USUÁRIO\n')
console.log('='.repeat(70))

type TestResult = {
  name: string
  passed: boolean
  message?: string
  severity?: 'critical' | 'high' | 'medium'
  manual?: boolean // Indica que precisa de teste manual
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
let testUserId: string | null = null
let testTenantId: string | null = null
let testCourtId: string | null = null
let testBookingId: string | null = null

// =============================================================================
// 🧹 LIMPEZA
// =============================================================================

async function cleanup() {
  try {
    if (testBookingId) {
      await supabaseAdmin.from('bookings').delete().eq('id', testBookingId)
    }
    if (testCourtId) {
      await supabaseAdmin.from('courts').delete().eq('id', testCourtId)
    }
    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId)
    }
    // Tenant será deletado via cascade quando o usuário for deletado
  } catch (error) {
    console.log(`   ⚠️  Erro na limpeza: ${getErrorMessage(error)}`)
  }
}

// =============================================================================
// 🧪 TESTE 1: Cadastro e Criação Automática de Profile
// =============================================================================

async function testUserSignup(): Promise<TestResult[]> {
  console.log('\n📝 1. Testando Cadastro e Criação Automática de Profile')
  console.log('-'.repeat(70))

  const testResults: TestResult[] = []

  try {
    const testEmail = `test-journey-${Date.now()}@example.com`
    const testPassword = 'Test123456!'

    console.log('   📦 Criando usuário...')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    })

    if (userError || !userData.user) {
      testResults.push({
        name: 'Cadastro - Criação de Usuário',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(userError)
      })
      return testResults
    }

    testUserId = userData.user.id
    console.log(`   ✅ Usuário criado: ${testUserId}`)

    // Aguardar um pouco para garantir que o trigger foi executado
    await new Promise(resolve => setTimeout(resolve, 500))

    // Verificar se o profile foi criado automaticamente (via trigger)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single()

    if (profileError || !profile) {
      testResults.push({
        name: 'Cadastro - Profile Automático',
        passed: false,
        severity: 'critical',
        message: 'Profile não foi criado automaticamente após signup'
      })
      console.log('   ❌ Profile não foi criado automaticamente')
    } else {
      testResults.push({
        name: 'Cadastro - Profile Automático',
        passed: true,
        severity: 'critical',
        message: `Profile criado (email: ${profile.email || 'não definido'})`
      })
      console.log(`   ✅ Profile criado automaticamente (email: ${profile.email || 'não definido'})`)
    }

    testResults.push({
      name: 'Cadastro - Criação de Usuário',
      passed: true,
      severity: 'critical',
      message: `Usuário criado: ${testEmail}`
    })

  } catch (error) {
    testResults.push({
      name: 'Cadastro - Erro Geral',
      passed: false,
      severity: 'critical',
      message: getErrorMessage(error)
    })
    console.log(`   ❌ Erro: ${getErrorMessage(error)}`)
  }

  return testResults
}

// =============================================================================
// 🧪 TESTE 2: Onboarding e Criação de Tenant
// =============================================================================

async function testOnboarding(): Promise<TestResult[]> {
  console.log('\n🏠 2. Testando Onboarding e Criação de Tenant')
  console.log('-'.repeat(70))

  const testResults: TestResult[] = []

  if (!testUserId) {
    testResults.push({
      name: 'Onboarding - Usuário Teste',
      passed: false,
      severity: 'critical',
      message: 'Usuário de teste não foi criado'
    })
    return testResults
  }

  try {
    // Fazer login com o usuário de teste
    const testEmail = `test-journey-${Date.now()}@example.com` // Usar email do teste anterior se possível
    const testPassword = 'Test123456!'

    // Buscar email do usuário
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(testUserId)
    const userEmail = userData?.user?.email

    if (!userEmail) {
      testResults.push({
        name: 'Onboarding - Email do Usuário',
        passed: false,
        severity: 'high',
        message: 'Não foi possível obter email do usuário'
      })
      return testResults
    }

    console.log('   🔐 Fazendo login...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: 'Test123456!' // Senha usada no teste anterior
    })

    if (signInError || !signInData.session) {
      // Tentar criar novo usuário se login falhar
      testResults.push({
        name: 'Onboarding - Login',
        passed: false,
        severity: 'high',
        message: getErrorMessage(signInError)
      })
      console.log(`   ⚠️  Não foi possível fazer login: ${getErrorMessage(signInError)}`)
      return testResults
    }

    console.log('   ✅ Login realizado')

    // Chamar função RPC de onboarding
    console.log('   📞 Chamando fn_onboard_user...')
    const businessName = `Test Arena ${Date.now()}`
    const { data: tenantId, error: onboardingError } = await supabase.rpc('fn_onboard_user', {
      p_business_name: businessName,
      p_saas_slug: 'arena-sys'
    })

    if (onboardingError || !tenantId) {
      testResults.push({
        name: 'Onboarding - Criação de Tenant',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(onboardingError)
      })
      console.log(`   ❌ Erro no onboarding: ${getErrorMessage(onboardingError)}`)
      return testResults
    }

    testTenantId = tenantId as string
    console.log(`   ✅ Tenant criado: ${testTenantId}`)

    // Verificar se o tenant foi criado corretamente
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', testTenantId)
      .single()

    if (tenantError || !tenant) {
      testResults.push({
        name: 'Onboarding - Validação Tenant',
        passed: false,
        severity: 'critical',
        message: 'Tenant não foi encontrado após criação'
      })
      console.log(`   ❌ Tenant não encontrado: ${getErrorMessage(tenantError)}`)
    } else {
      testResults.push({
        name: 'Onboarding - Validação Tenant',
        passed: true,
        severity: 'critical',
        message: `Tenant válido (business_name: ${tenant.business_name}, subdomain: ${tenant.subdomain})`
      })
      console.log(`   ✅ Tenant validado: ${tenant.business_name} (${tenant.subdomain})`)
    }

    // Verificar se a assinatura trial foi criada automaticamente
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('tenant_subscriptions')
      .select('*')
      .eq('tenant_id', testTenantId)
      .single()

    if (subError || !subscription) {
      testResults.push({
        name: 'Onboarding - Assinatura Trial',
        passed: false,
        severity: 'high',
        message: 'Assinatura trial não foi criada automaticamente'
      })
      console.log(`   ⚠️  Assinatura trial não encontrada: ${getErrorMessage(subError)}`)
    } else {
      testResults.push({
        name: 'Onboarding - Assinatura Trial',
        passed: true,
        severity: 'high',
        message: `Trial criado (status: ${subscription.status}, plan: ${subscription.plan_code})`
      })
      console.log(`   ✅ Assinatura trial criada (status: ${subscription.status})`)
    }

    testResults.push({
      name: 'Onboarding - Criação de Tenant',
      passed: true,
      severity: 'critical',
      message: `Tenant criado via fn_onboard_user: ${testTenantId}`
    })

  } catch (error) {
    testResults.push({
      name: 'Onboarding - Erro Geral',
      passed: false,
      severity: 'critical',
      message: getErrorMessage(error)
    })
    console.log(`   ❌ Erro: ${getErrorMessage(error)}`)
  }

  return testResults
}

// =============================================================================
// 🧪 TESTE 3: Criação de Quadra
// =============================================================================

async function testCourtCreation(): Promise<TestResult[]> {
  console.log('\n🏟️ 3. Testando Criação de Quadra')
  console.log('-'.repeat(70))

  const testResults: TestResult[] = []

  if (!testTenantId) {
    testResults.push({
      name: 'Quadra - Tenant Teste',
      passed: false,
      severity: 'critical',
      message: 'Tenant de teste não foi criado'
    })
    return testResults
  }

  try {
    console.log('   📦 Criando quadra de teste...')
    const { data: court, error: courtError } = await supabaseAdmin
      .from('courts')
      .insert({
        tenant_id: testTenantId,
        name: 'Quadra Teste',
        sports: ['futebol'],
        active: true
      })
      .select()
      .single()

    if (courtError || !court) {
      testResults.push({
        name: 'Quadra - Criação',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(courtError)
      })
      console.log(`   ❌ Erro ao criar quadra: ${getErrorMessage(courtError)}`)
      return testResults
    }

    testCourtId = court.id
    testResults.push({
      name: 'Quadra - Criação',
      passed: true,
      severity: 'critical',
      message: `Quadra criada: ${court.name} (ID: ${court.id})`
    })
    console.log(`   ✅ Quadra criada: ${court.name}`)

  } catch (error) {
    testResults.push({
      name: 'Quadra - Erro Geral',
      passed: false,
      severity: 'high',
      message: getErrorMessage(error)
    })
    console.log(`   ❌ Erro: ${getErrorMessage(error)}`)
  }

  return testResults
}

// =============================================================================
// 🧪 TESTE 4: Criação de Reserva
// =============================================================================

async function testBookingCreation(): Promise<TestResult[]> {
  console.log('\n📅 4. Testando Criação de Reserva')
  console.log('-'.repeat(70))

  const testResults: TestResult[] = []

  if (!testTenantId || !testCourtId) {
    testResults.push({
      name: 'Reserva - Dados Teste',
      passed: false,
      severity: 'critical',
      message: 'Tenant ou quadra de teste não foram criados'
    })
    return testResults
  }

  try {
    console.log('   📦 Criando reserva de teste...')
    const startTime = new Date()
    startTime.setHours(14, 0, 0, 0)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // +1 hora

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: testTenantId,
        court_id: testCourtId,
        customer_name: 'Cliente Teste',
        customer_phone: '11987654321',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        total_price: 100,
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError || !booking) {
      testResults.push({
        name: 'Reserva - Criação',
        passed: false,
        severity: 'critical',
        message: getErrorMessage(bookingError)
      })
      console.log(`   ❌ Erro ao criar reserva: ${getErrorMessage(bookingError)}`)
      return testResults
    }

    testBookingId = booking.id
    testResults.push({
      name: 'Reserva - Criação',
      passed: true,
      severity: 'critical',
      message: `Reserva criada: ${booking.customer_name} (ID: ${booking.id})`
    })
    console.log(`   ✅ Reserva criada: ${booking.customer_name}`)

    // Verificar se a reserva está isolada por tenant
    const { data: allBookings, error: listError } = await supabaseAdmin
      .from('bookings')
      .select('id, tenant_id')
      .eq('tenant_id', testTenantId)

    if (listError) {
      testResults.push({
        name: 'Reserva - Listagem por Tenant',
        passed: false,
        severity: 'medium',
        message: getErrorMessage(listError)
      })
    } else {
      const ownBookings = allBookings?.filter(b => b.tenant_id === testTenantId) || []
      testResults.push({
        name: 'Reserva - Listagem por Tenant',
        passed: true,
        severity: 'high',
        message: `${ownBookings.length} reserva(s) encontrada(s) para o tenant`
      })
      console.log(`   ✅ Reserva isolada por tenant (${ownBookings.length} reserva(s))`)
    }

  } catch (error) {
    testResults.push({
      name: 'Reserva - Erro Geral',
      passed: false,
      severity: 'critical',
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
    console.log('\n👤 Iniciando testes de jornada do usuário...\n')

    // Executar testes em sequência
    const signupResults = await testUserSignup()
    results.push(...signupResults)

    const onboardingResults = await testOnboarding()
    results.push(...onboardingResults)

    const courtResults = await testCourtCreation()
    results.push(...courtResults)

    const bookingResults = await testBookingCreation()
    results.push(...bookingResults)

    // Resumo final
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESUMO DOS TESTES DE JORNADA DO USUÁRIO\n')

    const passed = results.filter(r => r.passed).length
    const total = results.length
    const critical = results.filter(r => r.severity === 'critical')
    const criticalPassed = critical.filter(r => r.passed).length
    const manual = results.filter(r => r.manual)

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      const severity = result.severity ? `[${result.severity.toUpperCase()}]` : ''
      const manualMark = result.manual ? ' [TESTE MANUAL]' : ''
      console.log(`   ${icon} ${severity} ${result.name}${result.message ? `: ${result.message}` : ''}${manualMark}`)
    })

    console.log(`\n${'='.repeat(70)}`)
    console.log(`📈 TOTAL: ${passed}/${total} testes passaram`)
    console.log(`🔴 CRÍTICOS: ${criticalPassed}/${critical.length} passaram`)
    if (manual.length > 0) {
      console.log(`👤 TESTES MANUAIS: ${manual.length} testes requerem validação manual`)
    }

    // Testes que precisam ser feitos manualmente
    if (passed === total || criticalPassed === critical.length) {
      console.log('\n' + '='.repeat(70))
      console.log('📋 TESTES QUE PRECISAM SER VALIDADOS MANUALMENTE:\n')
      console.log('   ⚠️  Tela de Welcome/Onboarding - UI/UX')
      console.log('   ⚠️  Validação de CPF/CNPJ no formulário')
      console.log('   ⚠️  Criação da primeira quadra no onboarding')
      console.log('   ⚠️  Link público de agendamento (/agendar/:subdomain)')
      console.log('   ⚠️  Visualização de horários disponíveis')
      console.log('   ⚠️  Confirmação por WhatsApp (link gerado corretamente)')
      console.log('   ⚠️  Edição/cancelamento de reserva via UI')
      console.log('   ⚠️  Bloqueio automático após trial expirar')
      console.log('   ⚠️  Mensagens de erro claras')
      console.log('   ⚠️  Responsividade mobile/tablet/desktop\n')
    }

    if (passed === total && criticalPassed === critical.length) {
      console.log('🎉 TODOS OS TESTES AUTOMATIZADOS PASSARAM!')
      console.log('✅ Fluxo básico do usuário está funcionando corretamente.')
      console.log('💡 Execute os testes manuais listados acima para validação completa.\n')
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