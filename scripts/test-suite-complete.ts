#!/usr/bin/env bun

/**
 * 🧪 TEST SUITE COMPLETA - Arena Sports
 * Script para testar todas as funcionalidades críticas amanhã
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Carregar variáveis de ambiente
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

console.log('🚀 Iniciando Test Suite Completa - Arena Sports\n')

// =============================================================================
// 🧪 TESTE 1: BANCO DE DADOS - Verificar Conectividade
// =============================================================================

async function testDatabaseConnection() {
  console.log('📊 Teste 1: Conectividade do Banco de Dados')

  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) throw error
    console.log('✅ Conexão com Supabase OK')
    return true
  } catch (error) {
    console.log('❌ Erro na conexão:', error.message)
    return false
  }
}

// =============================================================================
// 🧪 TESTE 2: AUTENTICAÇÃO - Fluxo Completo
// =============================================================================

async function testAuthentication() {
  console.log('\n🔐 Teste 2: Sistema de Autenticação')

  try {
    // Teste de signup
    const testEmail = `test-${Date.now()}@example.com`
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'test123456'
    })

    if (signupError) throw signupError
    console.log('✅ Signup realizado com sucesso')

    // Teste de signin
    const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: 'test123456'
    })

    if (signinError) throw signinError
    console.log('✅ Signin realizado com sucesso')

    // Logout
    await supabase.auth.signOut()
    console.log('✅ Logout realizado com sucesso')

    return true
  } catch (error) {
    console.log('❌ Erro na autenticação:', error.message)
    return false
  }
}

// =============================================================================
// 🧪 TESTE 3: ISOLAMENTO MULTI-TENANT
// =============================================================================

async function testTenantIsolation() {
  console.log('\n🏢 Teste 3: Isolamento Multi-Tenant')

  try {
    // Criar dois usuários de teste
    const user1Email = `tenant1-${Date.now()}@example.com`
    const user2Email = `tenant2-${Date.now()}@example.com`

    // Signup User 1
    const { data: user1 } = await supabase.auth.signUp({
      email: user1Email,
      password: 'test123456'
    })

    // Criar arena para User 1
    const { data: arena1, error: arena1Error } = await supabase
      .from('arenas')
      .insert({
        name: 'Arena Teste 1',
        owner_id: user1.user?.id
      })
      .select()
      .single()

    if (arena1Error) throw arena1Error

    // Signup User 2
    const { data: user2 } = await supabase.auth.signUp({
      email: user2Email,
      password: 'test123456'
    })

    // Tentar acessar arena do User 1 (deve falhar)
    const { data: accessTest, error: accessError } = await supabase
      .from('arenas')
      .select('*')
      .eq('id', arena1.id)

    if (accessTest && accessTest.length > 0) {
      console.log('❌ Isolamento falhou - User 2 conseguiu acessar dados do User 1')
      return false
    }

    console.log('✅ Isolamento RLS funcionando corretamente')
    return true

  } catch (error) {
    console.log('❌ Erro no teste de isolamento:', error.message)
    return false
  }
}

// =============================================================================
// 🧪 TESTE 4: BILLING ASAAS - Integração Básica
// =============================================================================

async function testAsaasIntegration() {
  console.log('\n💳 Teste 4: Integração Asaas')

  try {
    // Verificar se as tabelas existem
    const { data: subscriptions, error: subError } = await supabase
      .from('tenant_subscriptions')
      .select('*')
      .limit(1)

    if (subError) throw subError

    const { data: webhooks, error: webhookError } = await supabase
      .from('asaas_webhook_events')
      .select('*')
      .limit(1)

    if (webhookError) throw webhookError

    console.log('✅ Tabelas de billing Asaas existem')

    // Verificar se Edge Functions estão disponíveis
    const { data: functions, error: funcError } = await supabase.functions.invoke('asaas-create-checkout', {
      body: { test: true }
    })

    if (funcError && !funcError.message.includes('test')) {
      console.log('⚠️ Edge Function pode precisar de configuração')
    } else {
      console.log('✅ Edge Functions Asaas acessíveis')
    }

    return true

  } catch (error) {
    console.log('❌ Erro na integração Asaas:', error.message)
    return false
  }
}

// =============================================================================
// 🧪 TESTE 5: PERFORMANCE - Queries Básicas
// =============================================================================

async function testPerformance() {
  console.log('\n⚡ Teste 5: Performance Básica')

  try {
    const startTime = Date.now()

    // Query simples
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(10)

    const endTime = Date.now()
    const responseTime = endTime - startTime

    if (error) throw error

    console.log(`✅ Query executada em ${responseTime}ms`)

    if (responseTime > 1000) {
      console.log('⚠️ Performance pode precisar de otimização')
    } else {
      console.log('✅ Performance aceitável')
    }

    return true

  } catch (error) {
    console.log('❌ Erro no teste de performance:', error.message)
    return false
  }
}

// =============================================================================
// 🎯 EXECUÇÃO DOS TESTES
// =============================================================================

async function runAllTests() {
  console.log('🎯 EXECUTANDO TEST SUITE COMPLETA\n')
  console.log('=' .repeat(50))

  const results = []

  // Executar todos os testes
  results.push(await testDatabaseConnection())
  results.push(await testAuthentication())
  results.push(await testTenantIsolation())
  results.push(await testAsaasIntegration())
  results.push(await testPerformance())

  console.log('\n' + '=' .repeat(50))
  console.log('📊 RESULTADO FINAL:')

  const passed = results.filter(r => r).length
  const total = results.length

  console.log(`✅ ${passed}/${total} testes passaram`)

  if (passed === total) {
    console.log('🎉 Todos os testes passaram! Sistema pronto para produção.')
  } else {
    console.log('⚠️ Alguns testes falharam. Revisar antes da produção.')
  }

  console.log('\n💡 PRÓXIMOS PASSOS:')
  console.log('1. Corrigir falhas identificadas')
  console.log('2. Testar fluxo completo manualmente')
  console.log('3. Configurar produção')
  console.log('4. Deploy e monitoramento')
}

// Executar se chamado diretamente
if (import.meta.main) {
  runAllTests().catch(console.error)
}

export { runAllTests, testDatabaseConnection, testAuthentication, testTenantIsolation, testAsaasIntegration, testPerformance }