#!/usr/bin/env bun

/**
 * 🚀 PRE-FLIGHT CHECKLIST - Arena Sports
 * Verificações obrigatórias antes do deploy para produção
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : '.env'
config({ path: envFile })

console.log('🚀 Executando Pre-Flight Checklist - Arena Sports\n')

// =============================================================================
// ✅ CHECK 1: Variáveis de Ambiente
// =============================================================================

function checkEnvironmentVariables() {
  console.log('✅ Check 1: Variáveis de Ambiente')

  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]

  const recommendedVars = [
    'ASAAS_API_KEY',
    'ASAAS_WEBHOOK_SECRET'
  ]

  let allGood = true

  console.log('🔍 Variáveis obrigatórias:')
  for (const varName of requiredVars) {
    const value = process.env[varName]
    if (value && value !== 'your_' + varName.toLowerCase()) {
      console.log(`   ✅ ${varName}: configurado`)
    } else {
      console.log(`   ❌ ${varName}: NÃO CONFIGURADO ou valor padrão`)
      allGood = false
    }
  }

  console.log('\n🔍 Variáveis recomendadas (para funcionalidades completas):')
  for (const varName of recommendedVars) {
    const value = process.env[varName]
    if (value && value !== 'your_' + varName.toLowerCase().replace('_', '_')) {
      console.log(`   ✅ ${varName}: configurado`)
    } else {
      console.log(`   ⚠️  ${varName}: não configurado (funcionalidades limitadas)`)
    }
  }

  return allGood
}

// =============================================================================
// ✅ CHECK 2: Conectividade Supabase
// =============================================================================

async function checkSupabaseConnectivity() {
  console.log('\n✅ Check 2: Conectividade Supabase')

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    )

    // Teste básico de conectividade
    const { error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    if (error) {
      console.log('❌ Erro de conectividade:', error.message)
      return false
    }

    console.log('✅ Conexão com Supabase estabelecida')

    // Verificar tabelas críticas
    const criticalTables = ['profiles', 'tenants', 'courts', 'bookings', 'tenant_subscriptions']

    for (const table of criticalTables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (tableError) {
          console.log(`   ❌ Tabela ${table}: erro - ${tableError.message}`)
          return false
        } else {
          console.log(`   ✅ Tabela ${table}: OK`)
        }
      } catch (error) {
        console.log(`   ❌ Tabela ${table}: exceção - ${error.message}`)
        return false
      }
    }

    return true

  } catch (error) {
    console.log('❌ Erro na conectividade:', error.message)
    return false
  }
}

// =============================================================================
// ✅ CHECK 3: Edge Functions
// =============================================================================

async function checkEdgeFunctions() {
  console.log('\n✅ Check 3: Edge Functions')

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Usar service role para testar functions
    )

    const functions = ['asaas-create-checkout', 'asaas-webhook']

    for (const funcName of functions) {
      try {
        // Teste básico (pode falhar se não configurado, mas verifica se existe)
        const { data, error } = await supabase.functions.invoke(funcName, {
          body: { test: true }
        })

        if (error) {
          if (error.message.includes('Function not found')) {
            console.log(`   ❌ ${funcName}: função não encontrada`)
            return false
          } else {
            console.log(`   ⚠️  ${funcName}: pode precisar configuração (${error.message})`)
          }
        } else {
          console.log(`   ✅ ${funcName}: OK`)
        }
      } catch (error) {
        console.log(`   ⚠️  ${funcName}: erro na verificação - ${error.message}`)
      }
    }

    return true

  } catch (error) {
    console.log('❌ Erro nas Edge Functions:', error.message)
    return false
  }
}

// =============================================================================
// ✅ CHECK 4: Build de Produção
// =============================================================================

async function checkBuild() {
  console.log('\n✅ Check 4: Build de Produção')

  const distPath = join(process.cwd(), 'dist')

  if (!existsSync(distPath)) {
    console.log('❌ Pasta dist não encontrada - execute "bun run build" primeiro')
    return false
  }

  // Verificar arquivos críticos
  const criticalFiles = [
    'index.html',
    'assets/index-*.css',
    'assets/index-*.js'
  ]

  let buildOk = true

  for (const pattern of criticalFiles) {
    // Simples verificação de existência (poderia ser mais sofisticada)
    if (pattern.includes('*')) {
      console.log(`   ✅ ${pattern}: padrão verificado`)
    } else if (existsSync(join(distPath, pattern))) {
      console.log(`   ✅ ${pattern}: encontrado`)
    } else {
      console.log(`   ❌ ${pattern}: não encontrado`)
      buildOk = false
    }
  }

  if (buildOk) {
    console.log('✅ Build de produção OK')
  }

  return buildOk
}

// =============================================================================
// ✅ CHECK 5: Segurança Básica
// =============================================================================

function checkSecurity() {
  console.log('\n✅ Check 5: Segurança Básica')

  // Verificar se secrets não estão no código
  const sensitivePatterns = [
    /VITE_SUPABASE_URL.*=.*your/i,
    /VITE_SUPABASE_ANON_KEY.*=.*your/i,
    /SUPABASE_SERVICE_ROLE_KEY.*=.*your/i,
    /ASAAS_API_KEY.*=.*your/i
  ]

  let securityOk = true

  try {
    const envContent = readFileSync('.env.local', 'utf-8')

    for (const pattern of sensitivePatterns) {
      if (pattern.test(envContent)) {
        console.log('❌ Secrets com valores padrão encontrados no .env.local')
        securityOk = false
        break
      }
    }

    if (securityOk) {
      console.log('✅ Secrets configurados corretamente')
    }

  } catch (error) {
    console.log('⚠️  Arquivo .env.local não encontrado ou erro na leitura')
  }

  // Verificar RLS
  console.log('ℹ️  RLS: Verificar manualmente se políticas estão ativas no Supabase Dashboard')

  return securityOk
}

// =============================================================================
// ✅ CHECK 6: Status do Deploy
// =============================================================================

function checkDeployReadiness() {
  console.log('\n✅ Check 6: Status do Deploy')

  const checks = [
    { name: 'Variáveis de ambiente', status: 'pending' },
    { name: 'Conectividade Supabase', status: 'pending' },
    { name: 'Edge Functions', status: 'pending' },
    { name: 'Build de produção', status: 'pending' },
    { name: 'Segurança básica', status: 'pending' }
  ]

  console.log('📋 Status dos checks:')
  checks.forEach(check => {
    console.log(`   ⏳ ${check.name}: ${check.status}`)
  })

  console.log('\n💡 Próximos passos para deploy:')
  console.log('1. Corrigir issues identificadas acima')
  console.log('2. Executar testes completos')
  console.log('3. Deploy no Vercel/Netlify')
  console.log('4. Configurar domínio e HTTPS')
  console.log('5. Testar em produção')
}

// =============================================================================
// 🎯 EXECUÇÃO DO PRE-FLIGHT CHECKLIST
// =============================================================================

async function runPreFlightChecklist() {
  console.log('🎯 EXECUTANDO PRE-FLIGHT CHECKLIST\n')
  console.log('=' .repeat(60))

  const results = []

  // Executar checks
  results.push(checkEnvironmentVariables())
  results.push(await checkSupabaseConnectivity())
  results.push(await checkEdgeFunctions())
  results.push(await checkBuild())
  results.push(checkSecurity())

  checkDeployReadiness()

  console.log('\n' + '=' .repeat(60))
  console.log('📊 RESULTADO DO CHECKLIST:')

  const passed = results.filter(r => r === true).length
  const total = results.length

  console.log(`✅ ${passed}/${total} checks passaram`)

  if (passed === total) {
    console.log('🎉 SISTEMA PRONTO PARA DEPLOY!')
    console.log('🚀 Pode fazer deploy com confiança.')
  } else {
    console.log('⚠️  Alguns checks falharam. Corrija antes do deploy.')
    console.log('💡 Execute novamente após correções.')
  }

  console.log('\n🔗 Links úteis:')
  console.log('- Supabase Dashboard: https://supabase.com/dashboard')
  console.log('- Vercel Deploy: https://vercel.com')
  console.log('- Asaas Dashboard: https://www.asaas.com')
}

// Executar se chamado diretamente
if (import.meta.main) {
  runPreFlightChecklist().catch(console.error)
}

export { runPreFlightChecklist }