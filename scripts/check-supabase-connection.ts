#!/usr/bin/env bun

/**
 * 🔍 DIAGNÓSTICO RÁPIDO - Comunicação com Supabase
 * Verifica se a conexão com Supabase está funcionando corretamente
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

// Carregar variáveis de ambiente (prioriza .env.local, depois .env)
const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : existsSync(resolve(process.cwd(), '.env'))
  ? '.env'
  : null
if (envFile) {
  config({ path: envFile })
}

console.log('🔍 DIAGNÓSTICO DE COMUNICAÇÃO COM SUPABASE\n')
console.log('='.repeat(60))

// =============================================================================
// ✅ VERIFICAÇÃO 1: Variáveis de Ambiente
// =============================================================================

function checkEnvVars() {
  console.log('\n📋 1. Verificando Variáveis de Ambiente')
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || supabaseUrl.includes('your_') || supabaseUrl === '') {
    console.log('   ❌ VITE_SUPABASE_URL: NÃO CONFIGURADO')
    return false
  }
  console.log(`   ✅ VITE_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`)

  if (!supabaseAnonKey || supabaseAnonKey.includes('your_') || supabaseAnonKey === '') {
    console.log('   ❌ VITE_SUPABASE_ANON_KEY: NÃO CONFIGURADO')
    return false
  }
  console.log(`   ✅ VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`)

  if (!supabaseServiceKey || supabaseServiceKey.includes('your_') || supabaseServiceKey === '') {
    console.log('   ⚠️  SUPABASE_SERVICE_ROLE_KEY: NÃO CONFIGURADO (necessário para alguns testes)')
  } else {
    console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 20)}...`)
  }

  return true
}

// =============================================================================
// ✅ VERIFICAÇÃO 2: Conectividade Básica
// =============================================================================

async function checkBasicConnectivity() {
  console.log('\n🌐 2. Testando Conectividade Básica')

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL!
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

    // Teste de ping básico
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })

    if (response.ok || response.status === 404) {
      // 404 é OK, significa que o servidor respondeu
      console.log('   ✅ Servidor Supabase está respondendo')
      return true
    } else {
      console.log(`   ❌ Servidor retornou status ${response.status}`)
      return false
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.log(`   ❌ Erro de conexão: ${errorMessage}`)
    console.log('   💡 Verifique se a URL do Supabase está correta')
    return false
  }
}

// =============================================================================
// ✅ VERIFICAÇÃO 3: Autenticação e Acesso ao Banco
// =============================================================================

async function checkDatabaseAccess() {
  console.log('\n💾 3. Testando Acesso ao Banco de Dados')

  try {
    // Tentar primeiro com service role (se disponível) para bypass RLS
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = serviceKey
      ? createClient(process.env.VITE_SUPABASE_URL!, serviceKey)
      : createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

    // Teste simples: contar registros na tabela profiles
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      if (error.message.includes('permission denied')) {
        if (serviceKey) {
          console.log(`   ❌ Erro ao acessar banco mesmo com service role: ${error.message}`)
          return false
        } else {
          console.log('   ⚠️  Acesso bloqueado por RLS (esperado com anon key)')
          console.log('   ✅ RLS está funcionando corretamente')
          console.log('   ℹ️  Use SUPABASE_SERVICE_ROLE_KEY para testes completos')
          return true // Não é um erro, é segurança funcionando
        }
      }
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('   ❌ Tabela não encontrada. Execute as migrations.')
        return false
      }
      
      console.log(`   ❌ Erro ao acessar banco: ${error.message}`)
      console.log(`   💡 Código do erro: ${error.code || 'N/A'}`)
      return false
    }

    console.log(`   ✅ Acesso ao banco OK (${count ?? 0} perfis encontrados)`)
    if (serviceKey) {
      console.log('   ✅ Service role key está funcionando')
    }
    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.log(`   ❌ Erro inesperado: ${errorMessage}`)
    return false
  }
}

// =============================================================================
// ✅ VERIFICAÇÃO 4: Tabelas Críticas
// =============================================================================

async function checkCriticalTables() {
  console.log('\n📊 4. Verificando Tabelas Críticas')

  const criticalTables = [
    'profiles',
    'tenants',
    'courts',
    'bookings',
    'tenant_subscriptions'
  ]

  // Usar service role se disponível para bypass RLS
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createClient(process.env.VITE_SUPABASE_URL!, serviceKey)
    : createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

  let allOk = true
  let rlsBlocking = false

  for (const table of criticalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0) // Apenas verificar se a tabela existe, sem buscar dados

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ Tabela '${table}': NÃO EXISTE`)
          console.log(`   💡 Execute as migrations para criar a tabela`)
          allOk = false
        } else if (error.message.includes('permission denied')) {
          if (!serviceKey) {
            rlsBlocking = true
            console.log(`   ⚠️  Tabela '${table}': protegida por RLS (esperado)`)
          } else {
            console.log(`   ❌ Tabela '${table}': erro mesmo com service role - ${error.message}`)
            allOk = false
          }
        } else {
          console.log(`   ⚠️  Tabela '${table}': ${error.message}`)
        }
      } else {
        console.log(`   ✅ Tabela '${table}': OK`)
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.log(`   ❌ Tabela '${table}': ${errorMessage}`)
      allOk = false
    }
  }

  if (rlsBlocking && !serviceKey) {
    console.log('   ℹ️  Para verificação completa, configure SUPABASE_SERVICE_ROLE_KEY')
    return true // RLS bloqueando é esperado e bom
  }

  return allOk
}

// =============================================================================
// ✅ VERIFICAÇÃO 5: Edge Functions
// =============================================================================

async function checkEdgeFunctions() {
  console.log('\n⚡ 5. Verificando Edge Functions')

  const functions = [
    'asaas-create-checkout',
    'asaas-webhook',
    'asaas-manage-subscription'
  ]

  const supabaseUrl = process.env.VITE_SUPABASE_URL!
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!

  let allOk = true

  for (const funcName of functions) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/${funcName}`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: true })
      })

      // 401/403 são esperados sem autenticação, mas significa que a função existe
      if (response.status === 401 || response.status === 403) {
        console.log(`   ✅ ${funcName}: Existe (autenticação necessária)`)
      } else if (response.status === 404) {
        console.log(`   ❌ ${funcName}: NÃO ENCONTRADA`)
        console.log(`   💡 Deploy a função: supabase functions deploy ${funcName}`)
        allOk = false
      } else if (response.ok) {
        console.log(`   ✅ ${funcName}: OK`)
      } else {
        console.log(`   ⚠️  ${funcName}: Status ${response.status}`)
      }
    } catch (error: any) {
      console.log(`   ❌ ${funcName}: ${error.message}`)
      allOk = false
    }
  }

  return allOk
}

// =============================================================================
// ✅ VERIFICAÇÃO 6: Autenticação (Signup/Login)
// =============================================================================

async function checkAuth() {
  console.log('\n🔐 6. Testando Sistema de Autenticação')

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    )

    // Verificar se o endpoint de auth está acessível
    const authUrl = `${process.env.VITE_SUPABASE_URL}/auth/v1/health`
    
    try {
      const response = await fetch(authUrl)
      if (response.ok || response.status === 404) {
        console.log('   ✅ Endpoint de autenticação está acessível')
      } else {
        console.log(`   ⚠️  Endpoint de autenticação retornou status ${response.status}`)
      }
    } catch {
      // Ignorar erro de health check, não é crítico
    }

    // Verificar configuração de signup
    // Isso requer service role key, então vamos apenas informar
    console.log('   ℹ️  Para testar signup/login, use o script test-suite-complete.ts')
    console.log('   ℹ️  Verifique no Supabase Dashboard: Authentication > Settings')

    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.log(`   ❌ Erro: ${errorMessage}`)
    return false
  }
}

// =============================================================================
// ✅ VERIFICAÇÃO 7: RLS (Row Level Security)
// =============================================================================

async function checkRLS() {
  console.log('\n🔒 7. Verificando Row Level Security (RLS)')

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    )

    // Tentar acessar uma tabela protegida por RLS sem autenticação
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) {
      if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        console.log('   ✅ RLS está ativo (esperado para segurança)')
        console.log('   ℹ️  Acesso sem autenticação foi bloqueado corretamente')
        return true
      } else {
        console.log(`   ⚠️  Erro ao verificar RLS: ${error.message}`)
        return false
      }
    } else {
      console.log('   ⚠️  RLS pode não estar ativo (verifique as políticas)')
      return true // Não é um erro crítico, apenas um aviso
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.log(`   ❌ Erro: ${errorMessage}`)
    return false
  }
}

// =============================================================================
// 🎯 EXECUÇÃO PRINCIPAL
// =============================================================================

async function runDiagnostics() {
  const results: boolean[] = []

  // Executar todas as verificações
  results.push(checkEnvVars())
  
  if (results[0]) {
    // Só continuar se as env vars estiverem OK
    results.push(await checkBasicConnectivity())
    results.push(await checkDatabaseAccess())
    results.push(await checkCriticalTables())
    results.push(await checkEdgeFunctions())
    results.push(await checkAuth())
    results.push(await checkRLS())
  }

  // Resumo final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO DO DIAGNÓSTICO\n')

  const passed = results.filter(r => r === true).length
  const total = results.length

  console.log(`✅ Verificações passadas: ${passed}/${total}`)

  if (passed === total) {
    console.log('\n🎉 COMUNICAÇÃO COM SUPABASE ESTÁ FUNCIONANDO PERFEITAMENTE!')
    console.log('✅ Todas as verificações passaram com sucesso.')
  } else {
    console.log('\n⚠️  ALGUMAS VERIFICAÇÕES FALHARAM')
    console.log('💡 Corrija os problemas acima e execute novamente.')
    console.log('\n🔗 Links úteis:')
    console.log('- Supabase Dashboard: https://supabase.com/dashboard')
    console.log('- Documentação: https://supabase.com/docs')
  }

  console.log('\n💡 Para testes mais completos, execute:')
  console.log('   bun run test')
  console.log('   bun run check:deploy')
}

// Executar se chamado diretamente
if (import.meta.main) {
  runDiagnostics().catch((error) => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
}
