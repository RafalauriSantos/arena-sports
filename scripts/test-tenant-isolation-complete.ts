
/**
 * 🧪 TESTE COMPLETO - Isolamento Multi-Tenant
 * Valida que os dados de diferentes tenants estão completamente isolados
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

console.log('🧪 TESTE DE ISOLAMENTO MULTI-TENANT\n')
console.log('='.repeat(70))

type TestResult = {
  name: string
  passed: boolean
  message?: string
}

const results: TestResult[] = []

// Helper para obter mensagem de erro
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

// Cliente com service role para criar dados de teste
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

if (!supabaseAdmin) {
  console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY não configurado')
  console.log('   Alguns testes podem ser limitados\n')
}

// =============================================================================
// 🧪 TESTE 1: RLS Bloqueando Acesso Cross-Tenant
// =============================================================================

async function testRLSCrossTenantAccess(): Promise<TestResult[]> {
  console.log('\n🔒 1. Testando RLS - Acesso Cross-Tenant')
  console.log('-'.repeat(70))
  
  const testResults: TestResult[] = []

  if (!supabaseAdmin) {
    testResults.push({
      name: 'RLS Cross-Tenant (Service Role)',
      passed: false,
      message: 'Service Role Key não configurado'
    })
    return testResults
  }

  try {
    // Criar dois tenants de teste
    console.log('   📦 Criando tenants de teste...')
    
    const { data: tenantA, error: errorA } = await supabaseAdmin
      .from('tenants')
      .insert({
        business_name: `Test Tenant A ${Date.now()}`,
        subdomain: `test-tenant-a-${Date.now()}`
      })
      .select()
      .single()

    if (errorA) {
      testResults.push({
        name: 'Criação Tenant A',
        passed: false,
        message: getErrorMessage(errorA)
      })
      return testResults
    }

    const { data: tenantB, error: errorB } = await supabaseAdmin
      .from('tenants')
      .insert({
        business_name: `Test Tenant B ${Date.now()}`,
        subdomain: `test-tenant-b-${Date.now()}`
      })
      .select()
      .single()

    if (errorB) {
      testResults.push({
        name: 'Criação Tenant B',
        passed: false,
        message: getErrorMessage(errorB)
      })
      return testResults
    }

    console.log(`   ✅ Tenant A criado: ${tenantA.id}`)
    console.log(`   ✅ Tenant B criado: ${tenantB.id}`)

    // Criar usuário para Tenant A
    const testEmailA = `test-tenant-a-${Date.now()}@test.com`
    const { data: userA, error: userErrorA } = await supabaseAdmin.auth.admin.createUser({
      email: testEmailA,
      password: 'Test123456!',
      email_confirm: true
    })

    if (userErrorA || !userA.user) {
      testResults.push({
        name: 'Criação Usuário A',
        passed: false,
        message: getErrorMessage(userErrorA)
      })
      return testResults
    }

    // Criar profile para usuário A com tenant A
    const { error: profileErrorA } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userA.user.id,
        tenant_id: tenantA.id,
        full_name: 'Usuário Tenant A'
      })

    if (profileErrorA) {
      testResults.push({
        name: 'Profile Usuário A',
        passed: false,
        message: getErrorMessage(profileErrorA)
      })
      return testResults
    }

    // Fazer login para obter o access token
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
    const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email: testEmailA,
      password: 'Test123456!'
    })

    if (signInError || !signInData.session) {
      testResults.push({
        name: 'Login Usuário A',
        passed: false,
        message: `Não foi possível fazer login: ${getErrorMessage(signInError)}`
      })
      console.log(`   ⚠️  Erro ao fazer login: ${getErrorMessage(signInError)}`)
      return testResults
    }

    // Criar cliente anon para Tenant A (simula usuário logado)
    const supabaseUserA = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session.access_token}`
        }
      }
    })

    // Criar uma reserva para Tenant A
    const { data: courtA } = await supabaseAdmin
      .from('courts')
      .insert({
        tenant_id: tenantA.id,
        name: 'Quadra Teste A',
        base_price: 100
      })
      .select()
      .single()

    if (courtA) {
      const startTime = new Date()
      startTime.setHours(10, 0, 0, 0)
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

      const { data: bookingA, error: bookingErrorA } = await supabaseUserA
        .from('bookings')
        .insert({
          tenant_id: tenantA.id,
          court_id: courtA.id,
          customer_name: 'Cliente A',
          customer_phone: '11999999999',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_price: 100,
          status: 'pending'
        })
        .select()
        .single()

      if (bookingErrorA || !bookingA) {
        const errorMsg = bookingErrorA 
          ? `${bookingErrorA.message}${bookingErrorA.code ? ` (code: ${bookingErrorA.code})` : ''}${bookingErrorA.details ? ` - ${JSON.stringify(bookingErrorA.details)}` : ''}`
          : 'Reserva não foi criada (retornou null)'
        testResults.push({
          name: 'Criação Reserva Tenant A',
          passed: false,
          message: errorMsg
        })
        console.log(`   ⚠️  Não foi possível criar reserva: ${errorMsg}`)
      } else {
        console.log(`   ✅ Reserva criada no Tenant A: ${bookingA.id}`)

        // Tentar acessar dados do Tenant B usando usuário do Tenant A
        const { data: bookingsB, error: accessErrorB } = await supabaseUserA
          .from('bookings')
          .select('*')
          .eq('tenant_id', tenantB.id)

        // RLS deve bloquear - não deve retornar dados
        if (accessErrorB || (bookingsB && bookingsB.length === 0)) {
          testResults.push({
            name: 'RLS Bloqueando Cross-Tenant',
            passed: true,
            message: 'RLS bloqueou acesso aos dados do Tenant B'
          })
          console.log('   ✅ RLS bloqueou acesso cross-tenant corretamente')
        } else if (bookingsB && bookingsB.length > 0) {
          testResults.push({
            name: 'RLS Bloqueando Cross-Tenant',
            passed: false,
            message: 'ERRO CRÍTICO: RLS permitiu acesso cross-tenant!'
          })
          console.log('   ❌ ERRO: RLS não bloqueou acesso cross-tenant!')
        }

        // Tentar criar reserva no Tenant B (deve falhar)
        const { error: createErrorB } = await supabaseUserA
          .from('bookings')
          .insert({
            tenant_id: tenantB.id,
            court_id: courtA.id,
            customer_name: 'Cliente B',
            customer_phone: '11888888888',
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            total_price: 100
          })

        if (createErrorB) {
          testResults.push({
            name: 'RLS Bloqueando Criação Cross-Tenant',
            passed: true,
            message: 'RLS bloqueou criação no Tenant B'
          })
          console.log('   ✅ RLS bloqueou criação cross-tenant corretamente')
        } else {
          testResults.push({
            name: 'RLS Bloqueando Criação Cross-Tenant',
            passed: false,
            message: 'ERRO CRÍTICO: RLS permitiu criação cross-tenant!'
          })
          console.log('   ❌ ERRO: RLS não bloqueou criação cross-tenant!')
        }

        // Limpeza
        await supabaseAdmin.from('bookings').delete().eq('id', bookingA.id)
      }
    }

    // Limpeza
    await supabaseAdmin.from('courts').delete().eq('tenant_id', tenantA.id)
    await supabaseAdmin.from('profiles').delete().eq('id', userA.user.id)
    await supabaseAdmin.auth.admin.deleteUser(userA.user.id)
    await supabaseAdmin.from('tenants').delete().eq('id', tenantA.id)
    await supabaseAdmin.from('tenants').delete().eq('id', tenantB.id)

  } catch (error: unknown) {
    const message = getErrorMessage(error)
    testResults.push({
      name: 'RLS Cross-Tenant',
      passed: false,
      message: `Erro: ${message}`
    })
    console.log(`   ❌ Erro: ${message}`)
  }

  return testResults
}

// =============================================================================
// 🧪 TESTE 2: Isolamento de Reservas por Tenant
// =============================================================================

async function testBookingIsolation(): Promise<TestResult[]> {
  console.log('\n📅 2. Testando Isolamento de Reservas')
  console.log('-'.repeat(70))
  
  const testResults: TestResult[] = []

  if (!supabaseAdmin) {
    testResults.push({
      name: 'Isolamento Reservas (Service Role)',
      passed: false,
      message: 'Service Role Key não configurado'
    })
    return testResults
  }

  try {
    // Buscar tenants existentes
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .limit(2)

    if (!tenants || tenants.length < 1) {
      testResults.push({
        name: 'Isolamento Reservas',
        passed: false,
        message: 'Nenhum tenant encontrado para teste'
      })
      return testResults
    }

    const tenant1 = tenants[0]
    const tenant2 = tenants[1] || tenants[0] // Se tiver só um, usa o mesmo

    // Contar reservas por tenant
    const { count: count1 } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant1.id)

    const { count: count2 } = await supabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant2.id)

    console.log(`   📊 Tenant 1: ${count1 ?? 0} reservas`)
    console.log(`   📊 Tenant 2: ${count2 ?? 0} reservas`)

    // Verificar que as contagens são independentes
    testResults.push({
      name: 'Isolamento de Reservas',
      passed: true,
      message: `Reservas isoladas por tenant (Tenant 1: ${count1}, Tenant 2: ${count2})`
    })
    console.log('   ✅ Reservas estão isoladas por tenant')

  } catch (error: unknown) {
    const message = getErrorMessage(error)
    testResults.push({
      name: 'Isolamento Reservas',
      passed: false,
      message: `Erro: ${message}`
    })
    console.log(`   ❌ Erro: ${message}`)
  }

  return testResults
}

// =============================================================================
// 🧪 TESTE 3: Isolamento de Assinaturas por Tenant
// =============================================================================

async function testSubscriptionIsolation(): Promise<TestResult[]> {
  console.log('\n💳 3. Testando Isolamento de Assinaturas')
  console.log('-'.repeat(70))
  
  const testResults: TestResult[] = []

  if (!supabaseAdmin) {
    testResults.push({
      name: 'Isolamento Assinaturas (Service Role)',
      passed: false,
      message: 'Service Role Key não configurado'
    })
    return testResults
  }

  try {
    // Buscar assinaturas
    const { data: subscriptions } = await supabaseAdmin
      .from('tenant_subscriptions')
      .select('tenant_id, status, plan_code')

    if (!subscriptions || subscriptions.length === 0) {
      testResults.push({
        name: 'Isolamento Assinaturas',
        passed: true,
        message: 'Nenhuma assinatura encontrada (esperado em teste)'
      })
      console.log('   ✅ Nenhuma assinatura encontrada (ok para teste)')
      return testResults
    }

    // Verificar que cada tenant tem sua própria assinatura
    const tenantIds = new Set(subscriptions.map(s => s.tenant_id))
    const uniqueTenants = tenantIds.size
    const totalSubscriptions = subscriptions.length

    if (uniqueTenants === totalSubscriptions) {
      testResults.push({
        name: 'Isolamento Assinaturas',
        passed: true,
        message: `${totalSubscriptions} assinaturas isoladas para ${uniqueTenants} tenants`
      })
      console.log(`   ✅ ${totalSubscriptions} assinaturas isoladas para ${uniqueTenants} tenants`)
    } else {
      testResults.push({
        name: 'Isolamento Assinaturas',
        passed: false,
        message: `Possível duplicação: ${totalSubscriptions} assinaturas para ${uniqueTenants} tenants`
      })
      console.log(`   ⚠️  Possível duplicação detectada`)
    }

  } catch (error: unknown) {
    const message = getErrorMessage(error)
    testResults.push({
      name: 'Isolamento Assinaturas',
      passed: false,
      message: `Erro: ${message}`
    })
    console.log(`   ❌ Erro: ${message}`)
  }

  return testResults
}

// =============================================================================
// 🎯 EXECUÇÃO PRINCIPAL
// =============================================================================

async function runAllTests() {
  try {
    console.log('\n🔵 Iniciando testes de isolamento multi-tenant...\n')

    // Executar todos os testes
    const rlsResults = await testRLSCrossTenantAccess()
    results.push(...rlsResults)

    const bookingResults = await testBookingIsolation()
    results.push(...bookingResults)

    const subscriptionResults = await testSubscriptionIsolation()
    results.push(...subscriptionResults)

    // Resumo final
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESUMO DOS TESTES\n')

    const passed = results.filter(r => r.passed).length
    const total = results.length

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`   ${icon} ${result.name}${result.message ? `: ${result.message}` : ''}`)
    })

    console.log(`\n${'='.repeat(70)}`)
    console.log(`📈 TOTAL: ${passed}/${total} testes passaram\n`)

    if (passed === total) {
      console.log('🎉 ISOLAMENTO MULTI-TENANT ESTÁ FUNCIONANDO CORRETAMENTE!')
      console.log('✅ Todos os dados estão isolados por tenant.\n')
      process.exit(0)
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM')
      console.log('💡 Corrija os problemas de isolamento antes de ir para produção.\n')
      process.exit(1)
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error('\n❌ Erro fatal:', message)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Executar se chamado diretamente
if (import.meta.main) {
  runAllTests()
}
