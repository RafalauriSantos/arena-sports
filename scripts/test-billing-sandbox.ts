import { config } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { classifyHttp, mask, validateSandboxConfig } from './billing-sandbox-test-core'

const envFile = existsSync(resolve(process.cwd(), '.env.local')) ? '.env.local' : '.env'
config({ path: envFile })

const cfg = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  anonKey: process.env.VITE_SUPABASE_ANON_KEY,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  asaasUrl: (process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3').replace(/\/+$/, ''),
  asaasKey: process.env.ASAAS_API_KEY,
  webhookToken: process.env.TEST_ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_SECRET || process.env.ASAAS_WEBHOOK_TOKEN,
  reconciliationToken: process.env.BILLING_RECONCILIATION_TOKEN || process.env.ASAAS_RECONCILIATION_TOKEN,
}

const strict = process.argv.includes('--strict') || process.env.CI === 'true'
const preflight = validateSandboxConfig(cfg)
console.log('Billing sandbox preflight')
console.log(`  Asaas URL: ${cfg.asaasUrl}`)
console.log(`  Asaas key: ${mask(cfg.asaasKey)}`)
console.log(`  Webhook token: ${cfg.webhookToken ? 'defined' : 'missing'}`)
console.log(`  Reconciliation token: ${cfg.reconciliationToken ? 'defined' : 'missing'}`)

if (preflight.errors.length) {
  console.error(`BLOCKED: variáveis obrigatórias ausentes/inseguras: ${preflight.errors.join(', ')}`)
  process.exit(1)
}
for (const warning of preflight.warnings) console.warn(`BLOCKED (etapa parcial): ${warning}`)

const asaasAccount = await fetch(`${cfg.asaasUrl}/myAccount`, { headers: { access_token: cfg.asaasKey! } })
if (!asaasAccount.ok) {
  console.error(`FAIL: chave sandbox não autenticou no Asaas (${asaasAccount.status})`)
  process.exit(1)
}
console.log('PASS: chave sandbox autenticou no Asaas')

const supabase = createClient(cfg.supabaseUrl!, cfg.anonKey!)
const functionUrl = `${cfg.supabaseUrl}/functions/v1`

async function probe(name: string, url: string, headers: Record<string, string>) {
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({}) })
  const state = classifyHttp(response.status)
  console.log(`${state === 'pass' ? 'PASS' : state === 'blocked' ? 'BLOCKED' : 'FAIL'}: ${name} (${response.status})`)
  return response.status
}

const anonHeaders = { apikey: cfg.anonKey!, 'Content-Type': 'application/json' }
const webhookWithoutToken = await probe('webhook rejects missing token', `${functionUrl}/asaas-webhook`, anonHeaders)
if (webhookWithoutToken !== 401) {
  console.error(`FAIL: webhook sem token deveria retornar 401, retornou ${webhookWithoutToken}`)
  process.exitCode = 1
}

if (cfg.webhookToken) {
  const status = await probe('webhook authorized contract', `${functionUrl}/asaas-webhook`, {
    ...anonHeaders,
    'asaas-access-token': cfg.webhookToken,
  })
  if (status === 401) process.exitCode = 1
}

if (cfg.reconciliationToken) {
  const status = await probe('reconciliation authorized contract', `${functionUrl}/asaas-reconcile-billing`, {
    ...anonHeaders,
    'x-reconciliation-token': cfg.reconciliationToken,
  })
  if (status >= 500) process.exitCode = 1
}

// Keep the client instantiated here so this preflight also verifies the URL/key pair is usable.
await supabase.auth.getSession()
if (strict && preflight.warnings.length) process.exitCode = 1
if (process.exitCode) process.exit(1)
console.log('Sandbox preflight concluído; para checkout real, execute com --strict e tokens configurados.')
