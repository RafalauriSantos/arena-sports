
/**
 * 🧪 TESTE COMPLETO - Conexões Supabase e Asaas
 * Verifica se as conexões com Supabase e Asaas estão funcionando corretamente
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
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

console.log('🧪 TESTE DE CONEXÕES - SUPABASE E ASAAS\n')
console.log('='.repeat(70))

type TestResult = {
  name: string
  passed: boolean
  message?: string
  details?: string[]
}

type AsaasAccountResponse = {
  name?: string
  email?: string
  sandbox?: boolean
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

// =============================================================================
// 📋 PARTE 1: TESTES SUPABASE
// =============================================================================

async function testSupabaseConnection(): Promise<TestResult[]> {
  console.log('\n🔵 TESTES DE CONEXÃO SUPABASE')
  console.log('-'.repeat(70))
  
  const supabaseResults: TestResult[] = []

  // Teste 1: Variáveis de ambiente
  console.log('\n📋 1. Verificando Variáveis de Ambiente')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || supabaseUrl.includes('your_') || supabaseUrl === '') {
    supabaseResults.push({
      name: 'Variáveis de Ambiente',
      passed: false,
      message: 'VITE_SUPABASE_URL não configurado'
    })
    console.log('   ❌ VITE_SUPABASE_URL: NÃO CONFIGURADO')
  } else {
    console.log(`   ✅ VITE_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`)
  }

  if (!supabaseAnonKey || supabaseAnonKey.includes('your_') || supabaseAnonKey === '') {
    supabaseResults.push({
      name: 'Variáveis de Ambiente',
      passed: false,
      message: 'VITE_SUPABASE_ANON_KEY não configurado'
    })
    console.log('   ❌ VITE_SUPABASE_ANON_KEY: NÃO CONFIGURADO')
  } else {
    console.log(`   ✅ VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`)
  }

  if (!supabaseServiceKey || supabaseServiceKey.includes('your_') || supabaseServiceKey === '') {
    console.log('   ⚠️  SUPABASE_SERVICE_ROLE_KEY: NÃO CONFIGURADO (opcional para alguns testes)')
  } else {
    console.log(`   ✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 20)}...`)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResults
  }

  // Teste 2: Conectividade básica
  console.log('\n🌐 2. Testando Conectividade Básica')
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })

    if (response.ok || response.status === 404) {
      console.log('   ✅ Servidor Supabase está respondendo')
      supabaseResults.push({
        name: 'Conectividade Básica',
        passed: true
      })
    } else {
      console.log(`   ❌ Servidor retornou status ${response.status}`)
      supabaseResults.push({
        name: 'Conectividade Básica',
        passed: false,
        message: `Status ${response.status}`
      })
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.log(`   ❌ Erro de conexão: ${message}`)
    supabaseResults.push({
      name: 'Conectividade Básica',
      passed: false,
      message
    })
  }

  // Teste 3: Acesso ao banco de dados
  console.log('\n💾 3. Testando Acesso ao Banco de Dados')
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : createClient(supabaseUrl, supabaseAnonKey)

    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      if (error.message.includes('permission denied')) {
        if (serviceKey) {
          console.log(`   ❌ Erro ao acessar banco: ${error.message}`)
          supabaseResults.push({
            name: 'Acesso ao Banco',
            passed: false,
            message: error.message
          })
        } else {
          console.log('   ⚠️  Acesso bloqueado por RLS (esperado com anon key)')
          console.log('   ✅ RLS está funcionando corretamente')
          supabaseResults.push({
            name: 'Acesso ao Banco',
            passed: true,
            message: 'RLS bloqueando acesso (esperado)'
          })
        }
      } else if (error.message.includes('does not exist')) {
        console.log('   ❌ Tabela não encontrada')
        supabaseResults.push({
          name: 'Acesso ao Banco',
          passed: false,
          message: 'Tabela profiles não existe'
        })
      } else {
        console.log(`   ❌ Erro: ${error.message}`)
        supabaseResults.push({
          name: 'Acesso ao Banco',
          passed: false,
          message: error.message
        })
      }
    } else {
      console.log(`   ✅ Acesso ao banco OK (${count ?? 0} perfis encontrados)`)
      supabaseResults.push({
        name: 'Acesso ao Banco',
        passed: true,
        message: `${count ?? 0} perfis encontrados`
      })
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.log(`   ❌ Erro inesperado: ${message}`)
    supabaseResults.push({
      name: 'Acesso ao Banco',
      passed: false,
      message
    })
  }

  // Teste 4: Tabelas críticas
  console.log('\n📊 4. Verificando Tabelas Críticas')
  const criticalTables = ['profiles', 'tenants', 'courts', 'bookings', 'tenant_subscriptions']
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : createClient(supabaseUrl, supabaseAnonKey)

  const tableStatus: string[] = []
  let allTablesOk = true

  for (const table of criticalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0)

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ❌ ${table}: NÃO EXISTE`)
          tableStatus.push(`${table}: NÃO EXISTE`)
          allTablesOk = false
        } else if (error.message.includes('permission denied') && !serviceKey) {
          console.log(`   ⚠️  ${table}: protegida por RLS (esperado)`)
          tableStatus.push(`${table}: OK (RLS)`)
        } else {
          console.log(`   ❌ ${table}: ${error.message}`)
          tableStatus.push(`${table}: ${error.message}`)
          allTablesOk = false
        }
      } else {
        console.log(`   ✅ ${table}: OK`)
        tableStatus.push(`${table}: OK`)
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      console.log(`   ❌ ${table}: ${message}`)
      tableStatus.push(`${table}: ${message}`)
      allTablesOk = false
    }
  }

  supabaseResults.push({
    name: 'Tabelas Críticas',
    passed: allTablesOk,
    details: tableStatus
  })

  // Teste 5: Edge Functions
  console.log('\n⚡ 5. Verificando Edge Functions')
  const functions = ['asaas-create-checkout', 'asaas-webhook', 'asaas-manage-subscription']
  const functionStatus: string[] = []
  let allFunctionsOk = true

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

      if (response.status === 401 || response.status === 403) {
        console.log(`   ✅ ${funcName}: Existe (autenticação necessária)`)
        functionStatus.push(`${funcName}: OK`)
      } else if (response.status === 404) {
        console.log(`   ❌ ${funcName}: NÃO ENCONTRADA`)
        functionStatus.push(`${funcName}: NÃO ENCONTRADA`)
        allFunctionsOk = false
      } else {
        console.log(`   ⚠️  ${funcName}: Status ${response.status}`)
        functionStatus.push(`${funcName}: Status ${response.status}`)
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      console.log(`   ❌ ${funcName}: ${message}`)
      functionStatus.push(`${funcName}: ${message}`)
      allFunctionsOk = false
    }
  }

  supabaseResults.push({
    name: 'Edge Functions',
    passed: allFunctionsOk,
    details: functionStatus
  })

  return supabaseResults
}

// =============================================================================
// 💳 PARTE 2: TESTES ASAAS
// =============================================================================

async function testAsaasConnection(): Promise<TestResult[]> {
  console.log('\n\n🟢 TESTES DE CONEXÃO ASAAS')
  console.log('-'.repeat(70))
  
  const asaasResults: TestResult[] = []

  // Teste 1: Variáveis de ambiente
  console.log('\n📋 1. Verificando Variáveis de Ambiente')
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY
  const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3'

  if (!ASAAS_API_KEY) {
    console.log('   ❌ ASAAS_API_KEY: NÃO CONFIGURADO')
    asaasResults.push({
      name: 'Variáveis de Ambiente',
      passed: false,
      message: 'ASAAS_API_KEY não configurado'
    })
    return asaasResults
  }

  console.log(`   ✅ ASAAS_API_KEY: ${ASAAS_API_KEY.substring(0, 20)}...`)
  console.log(`   ✅ ASAAS_API_URL: ${ASAAS_API_URL}`)

  const isSandbox = ASAAS_API_URL.includes('sandbox')
  const environment = isSandbox ? 'SANDBOX (Testes)' : 'PRODUÇÃO'
  console.log(`   📦 Ambiente: ${environment}`)

  // Teste 2: Validação da chave de API
  console.log('\n🔑 2. Validando Chave de API')
  try {
    const testUrl = `${ASAAS_API_URL.replace('/api/v3', '').replace('/v3', '')}/api/v3/myAccount`
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    const responseText = await response.text()
    let responseData: AsaasAccountResponse = { message: responseText }
    
    try {
      responseData = JSON.parse(responseText) as AsaasAccountResponse
    } catch {
      responseData = { message: responseText }
    }

    if (response.ok) {
      console.log('   ✅ Chave de API válida!')
      console.log(`   📊 Nome: ${responseData.name || 'N/A'}`)
      console.log(`   📊 Email: ${responseData.email || 'N/A'}`)
      
      const keyIsSandbox = responseData.sandbox === true
      if (keyIsSandbox !== isSandbox) {
        console.log('   ⚠️  Ambiente da chave não corresponde à URL configurada!')
        asaasResults.push({
          name: 'Validação da Chave',
          passed: false,
          message: `Ambiente da chave (${keyIsSandbox ? 'SANDBOX' : 'PRODUÇÃO'}) não corresponde à URL (${environment})`
        })
      } else {
        console.log('   ✅ Ambiente da chave corresponde à URL configurada!')
        asaasResults.push({
          name: 'Validação da Chave',
          passed: true,
          message: `Ambiente: ${environment}`
        })
      }
    } else {
      console.log(`   ❌ Erro ao validar chave: Status ${response.status}`)
      console.log(`   📄 Resposta: ${responseText.substring(0, 200)}`)
      asaasResults.push({
        name: 'Validação da Chave',
        passed: false,
        message: `Status ${response.status}: ${responseData.message || responseText}`
      })
    }
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.log(`   ❌ Erro ao testar chave: ${message}`)
    asaasResults.push({
      name: 'Validação da Chave',
      passed: false,
      message
    })
  }

  // Teste 3: Verificar configuração no Supabase (se disponível)
  console.log('\n🔐 3. Verificando Configuração no Supabase')
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    // Testar se os secrets estão acessíveis nas Edge Functions
    try {
      const checkoutResponse = await fetch(`${supabaseUrl}/functions/v1/asaas-create-checkout`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan_code: 'start', interval: 'month' })
      })

      const checkoutText = await checkoutResponse.text()
      const hasMissingToken = /Missing ASAAS_ACCESS_TOKEN/i.test(checkoutText) || 
                            /Missing ASAAS_API_KEY/i.test(checkoutText) ||
                            /Missing ASAAS_API_URL/i.test(checkoutText)

      if (hasMissingToken) {
        console.log('   ❌ Secrets do Asaas não estão acessíveis na Edge Function')
        asaasResults.push({
          name: 'Secrets no Supabase',
          passed: false,
          message: 'ASAAS_API_KEY ou ASAAS_API_URL não configurados no Supabase'
        })
      } else if (checkoutResponse.status === 401) {
        console.log('   ✅ Secrets do Asaas estão acessíveis (401 = autenticação necessária)')
        asaasResults.push({
          name: 'Secrets no Supabase',
          passed: true,
          message: 'Secrets acessíveis nas Edge Functions'
        })
      } else {
        console.log(`   ⚠️  Status inesperado: ${checkoutResponse.status}`)
        asaasResults.push({
          name: 'Secrets no Supabase',
          passed: true,
          message: `Status ${checkoutResponse.status}`
        })
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      console.log(`   ⚠️  Não foi possível verificar secrets: ${message}`)
      asaasResults.push({
        name: 'Secrets no Supabase',
        passed: false,
        message
      })
    }
  } else {
    console.log('   ⚠️  Supabase não configurado, pulando verificação de secrets')
    asaasResults.push({
      name: 'Secrets no Supabase',
      passed: true,
      message: 'Pulado (Supabase não configurado)'
    })
  }

  return asaasResults
}

// =============================================================================
// 🎯 EXECUÇÃO PRINCIPAL
// =============================================================================

async function runAllTests() {
  try {
    // Executar testes do Supabase
    const supabaseResults = await testSupabaseConnection()
    results.push(...supabaseResults)

    // Executar testes do Asaas
    const asaasResults = await testAsaasConnection()
    results.push(...asaasResults)

    // Resumo final
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESUMO DOS TESTES\n')

    const supabasePassed = supabaseResults.filter(r => r.passed).length
    const supabaseTotal = supabaseResults.length
    const asaasPassed = asaasResults.filter(r => r.passed).length
    const asaasTotal = asaasResults.length

    console.log(`🔵 SUPABASE: ${supabasePassed}/${supabaseTotal} testes passaram`)
    supabaseResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`   ${icon} ${result.name}${result.message ? `: ${result.message}` : ''}`)
      if (result.details) {
        result.details.forEach(detail => {
          console.log(`      - ${detail}`)
        })
      }
    })

    console.log(`\n🟢 ASAAS: ${asaasPassed}/${asaasTotal} testes passaram`)
    asaasResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`   ${icon} ${result.name}${result.message ? `: ${result.message}` : ''}`)
      if (result.details) {
        result.details.forEach(detail => {
          console.log(`      - ${detail}`)
        })
      }
    })

    const totalPassed = results.filter(r => r.passed).length
    const totalTests = results.length

    console.log(`\n${'='.repeat(70)}`)
    console.log(`📈 TOTAL: ${totalPassed}/${totalTests} testes passaram\n`)

    if (totalPassed === totalTests) {
      console.log('🎉 TODAS AS CONEXÕES ESTÃO FUNCIONANDO PERFEITAMENTE!')
      console.log('✅ Supabase e Asaas estão configurados e operacionais.\n')
      process.exit(0)
    } else {
      console.log('⚠️  ALGUMAS CONEXÕES FALHARAM')
      console.log('💡 Corrija os problemas acima e execute novamente.\n')
      console.log('🔗 Links úteis:')
      console.log('   - Supabase Dashboard: https://supabase.com/dashboard')
      console.log('   - Asaas Sandbox: https://sandbox.asaas.com')
      console.log('   - Asaas Produção: https://www.asaas.com\n')
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
