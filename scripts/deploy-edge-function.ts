#!/usr/bin/env bun

/**
 * 🚀 Script de Deploy de Edge Functions via API do Supabase
 * 
 * Este script faz deploy de Edge Functions usando a API REST do Supabase,
 * sem precisar do Supabase CLI instalado.
 */

import { config } from 'dotenv'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { createHash } from 'crypto'

// Carregar variáveis de ambiente
const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : '.env'
config({ path: envFile })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios')
  console.error('💡 Configure essas variáveis no arquivo .env.local')
  process.exit(1)
}

// Extrair project-ref da URL
const projectRefMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/)
if (!projectRefMatch) {
  console.error('❌ Erro: URL do Supabase inválida')
  process.exit(1)
}
const projectRef = projectRefMatch[1]

console.log(`🚀 Deploy de Edge Functions para: ${projectRef}\n`)

/**
 * Fazer deploy de uma função via API do Supabase
 */
async function deployFunction(functionName: string) {
  const functionPath = join(process.cwd(), 'supabase', 'functions', functionName)
  
  if (!existsSync(functionPath)) {
    console.error(`❌ Função '${functionName}' não encontrada em: ${functionPath}`)
    return false
  }

  console.log(`📦 Preparando deploy de: ${functionName}`)

  // Ler o arquivo index.ts da função
  const indexFile = join(functionPath, 'index.ts')
  if (!existsSync(indexFile)) {
    console.error(`❌ Arquivo index.ts não encontrado em: ${functionPath}`)
    return false
  }

  const functionCode = readFileSync(indexFile, 'utf-8')

  // Criar um bundle simples (para produção, você usaria o Deno bundler)
  // Por enquanto, vamos apenas enviar o código diretamente
  const bundle = {
    entrypoint: 'index.ts',
    code: functionCode,
    assets: {}
  }

  // Ler arquivos adicionais se houver
  try {
    const files = readdirSync(functionPath)
    for (const file of files) {
      if (file !== 'index.ts' && file.endsWith('.ts')) {
        const filePath = join(functionPath, file)
        const stats = statSync(filePath)
        if (stats.isFile()) {
          bundle.assets[file] = readFileSync(filePath, 'utf-8')
        }
      }
    }
  } catch (error) {
    // Ignorar erros ao ler arquivos adicionais
  }

  // Fazer deploy via API
  const deployUrl = `https://api.supabase.com/v1/projects/${projectRef}/functions/${functionName}`
  
  try {
    const response = await fetch(deployUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: functionCode,
        verify_jwt: false // Configurar conforme necessário
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro no deploy: ${response.status} ${response.statusText}`)
      console.error(`   Resposta: ${errorText}`)
      
      // Tentar método alternativo via Supabase Management API
      console.log(`\n💡 Tentando método alternativo...`)
      return await deployFunctionAlternative(functionName, functionCode)
    }

    console.log(`✅ Função '${functionName}' deployada com sucesso!`)
    return true
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`❌ Erro ao fazer deploy: ${errorMessage}`)
    return false
  }
}

/**
 * Método alternativo: usar o endpoint de deploy do Supabase
 */
async function deployFunctionAlternative(functionName: string, code: string) {
  // O Supabase Management API pode ter endpoints diferentes
  // Vamos tentar o endpoint de deploy direto
  const deployUrl = `https://${projectRef}.supabase.co/functions/v1/${functionName}`
  
  console.log(`⚠️  Método alternativo não disponível via API REST`)
  console.log(`\n💡 Para fazer deploy via CLI, você precisa:`)
  console.log(`   1. Instalar Node.js: https://nodejs.org/`)
  console.log(`   2. Instalar Supabase CLI: npm install -g supabase`)
  console.log(`   3. Executar: supabase functions deploy ${functionName}`)
  console.log(`\n💡 Ou use o Dashboard do Supabase:`)
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/functions`)
  
  return false
}

/**
 * Função principal
 */
async function main() {
  const functionName = process.argv[2] || 'asaas-manage-subscription'
  
  if (!functionName) {
    console.error('❌ Erro: Nome da função não fornecido')
    console.error('💡 Uso: bun run scripts/deploy-edge-function.ts <nome-da-funcao>')
    process.exit(1)
  }

  console.log(`🎯 Deployando função: ${functionName}\n`)
  
  const success = await deployFunction(functionName)
  
  if (success) {
    console.log(`\n✅ Deploy concluído!`)
    console.log(`\n💡 Verifique no Dashboard:`)
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/functions`)
  } else {
    console.log(`\n❌ Deploy falhou. Veja as instruções acima.`)
    process.exit(1)
  }
}

if (import.meta.main) {
  main().catch(console.error)
}
