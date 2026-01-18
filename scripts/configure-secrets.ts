#!/usr/bin/env bun

/**
 * 🔐 Script para Configurar Secrets do Supabase
 * 
 * Este script configura os secrets necessários para as Edge Functions
 * usando os valores do arquivo .env.local
 */

import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

// Bun is available at runtime when executed with 'bun run'
declare const Bun: {
  spawn(
    command: string[],
    options?: {
      stdout?: 'pipe' | 'inherit' | 'ignore';
      stderr?: 'pipe' | 'inherit' | 'ignore';
    }
  ): {
    exited: Promise<number>;
    exitCode: number | null;
    stdout: ReadableStream;
    stderr: ReadableStream;
  };
}

// Carregar variáveis de ambiente (prioriza .env.local, depois .env)
const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : existsSync(resolve(process.cwd(), '.env'))
  ? '.env'
  : null
if (envFile) {
  config({ path: envFile })
}

const secrets = {
  ASAAS_API_KEY: process.env.ASAAS_API_KEY,
  ASAAS_WEBHOOK_SECRET: process.env.ASAAS_WEBHOOK_SECRET,
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ASAAS_API_URL: process.env.ASAAS_API_URL || 'https://api.asaas.com/v3'
}

console.log('🔐 Configurando Secrets do Supabase\n')

// Verificar quais secrets estão faltando
const missing: string[] = []
for (const [key, value] of Object.entries(secrets)) {
  if (!value || value.includes('your_') || value === '') {
    missing.push(key)
  }
}

if (missing.length > 0) {
  console.error('❌ Secrets faltando no .env.local:')
  missing.forEach(key => console.error(`   - ${key}`))
  console.error('\n💡 Configure esses valores no arquivo .env.local primeiro')
  process.exit(1)
}

// Configurar cada secret
console.log('📦 Configurando secrets...\n')

for (const [key, value] of Object.entries(secrets)) {
  if (value) {
    try {
      console.log(`   Configurando ${key}...`)
      const proc = Bun.spawn(['bunx', 'supabase', 'secrets', 'set', `${key}=${value}`], {
        stdout: 'pipe',
        stderr: 'pipe'
      })
      await proc.exited
      if (proc.exitCode === 0) {
        console.log(`   ✅ ${key} configurado`)
      } else {
        const stderr = await new Response(proc.stderr).text()
        throw new Error(stderr)
      }
    } catch (error: any) {
      console.error(`   ❌ Erro ao configurar ${key}:`, error.message || error)
    }
  }
}

console.log('\n✅ Secrets configurados com sucesso!')
console.log('\n💡 Verifique no Dashboard:')
console.log('   https://supabase.com/dashboard/project/extkyeckajhcozjervyr/functions')
