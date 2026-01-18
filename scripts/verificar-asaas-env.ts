#!/usr/bin/env bun

/**
 * 🔍 Script para Verificar Configuração do Asaas
 * Verifica se a chave de API corresponde ao ambiente configurado
 */

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

type AsaasAccountResponse = {
  name?: string
  email?: string
  sandbox?: boolean
  message?: string
}

const ASAAS_API_KEY = process.env.ASAAS_API_KEY
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3'

console.log('🔍 Verificando Configuração do Asaas\n')
console.log('='.repeat(60))

if (!ASAAS_API_KEY) {
  console.error('❌ ASAAS_API_KEY não encontrada no .env')
  console.log('\n💡 Configure a chave no arquivo .env ou .env.local')
  process.exit(1)
}

// Detectar ambiente baseado na URL
const isSandbox = ASAAS_API_URL.includes('sandbox')
const environment = isSandbox ? 'SANDBOX (Testes)' : 'PRODUÇÃO'

console.log(`📦 Ambiente configurado: ${environment}`)
console.log(`🌐 URL da API: ${ASAAS_API_URL}`)
console.log(`🔑 Chave API: ${ASAAS_API_KEY.substring(0, 20)}...`)

// Testar a chave fazendo uma requisição simples
console.log('\n🧪 Testando chave de API...\n')

try {
  const testUrl = `${ASAAS_API_URL.replace('/api/v3', '')}/api/v3/myAccount`
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
    console.log('✅ Chave de API válida!')
    console.log(`\n📊 Informações da conta:`)
    console.log(`   Nome: ${responseData.name || 'N/A'}`)
    console.log(`   Email: ${responseData.email || 'N/A'}`)
    console.log(`   Ambiente: ${responseData.sandbox ? 'SANDBOX' : 'PRODUÇÃO'}`)
    
    // Verificar se o ambiente da chave corresponde à URL configurada
    const keyIsSandbox = responseData.sandbox === true
    if (keyIsSandbox !== isSandbox) {
      console.log('\n⚠️  ATENÇÃO: Ambiente da chave não corresponde à URL configurada!')
      console.log(`   Chave é de: ${keyIsSandbox ? 'SANDBOX' : 'PRODUÇÃO'}`)
      console.log(`   URL configurada: ${environment}`)
      console.log('\n💡 Solução:')
      if (keyIsSandbox) {
        console.log('   Configure ASAAS_API_URL=https://sandbox.asaas.com/api/v3')
      } else {
        console.log('   Configure ASAAS_API_URL=https://api.asaas.com/v3')
      }
    } else {
      console.log('\n✅ Ambiente da chave corresponde à URL configurada!')
    }
  } else {
    console.error('❌ Erro ao validar chave de API')
    console.error(`   Status: ${response.status}`)
    console.error(`   Resposta: ${responseText}`)
    
    if (response.status === 401) {
      console.log('\n💡 A chave de API está incorreta ou inválida')
    } else if (responseData.message?.includes('não pertence a este ambiente')) {
      console.log('\n💡 A chave de API não corresponde ao ambiente configurado')
      console.log('   Verifique se está usando:')
      console.log('   - Chave de SANDBOX com URL: https://sandbox.asaas.com/api/v3')
      console.log('   - Chave de PRODUÇÃO com URL: https://api.asaas.com/v3')
    }
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Erro desconhecido'
  console.error('❌ Erro ao testar chave:', message)
}

console.log('\n' + '='.repeat(60))
console.log('\n📝 Como corrigir:')
console.log('\n1. Verifique no Dashboard do Asaas qual ambiente sua chave pertence')
console.log('   - Sandbox: https://sandbox.asaas.com')
console.log('   - Produção: https://www.asaas.com')
console.log('\n2. Configure a URL correta:')
console.log('   - Sandbox: ASAAS_API_URL=https://sandbox.asaas.com/api/v3')
console.log('   - Produção: ASAAS_API_URL=https://api.asaas.com/v3')
console.log('\n3. Configure no Supabase:')
console.log('   bunx supabase secrets set ASAAS_API_URL=<url_correta>')
console.log('   bunx supabase secrets set ASAAS_API_KEY=<sua_chave>')
