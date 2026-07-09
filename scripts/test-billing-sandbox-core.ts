import assert from 'node:assert/strict'
import { classifyHttp, isSandboxUrl, validateSandboxConfig } from './billing-sandbox-test-core'

assert.equal(isSandboxUrl('https://sandbox.asaas.com/api/v3'), true)
assert.equal(isSandboxUrl('https://api.asaas.com/v3'), false)
assert.deepEqual(validateSandboxConfig({}).errors, [
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ASAAS_API_KEY',
  'ASAAS_API_URL',
])
assert.equal(classifyHttp(200), 'pass')
assert.equal(classifyHttp(401), 'blocked')
assert.equal(classifyHttp(500), 'fail')
console.log('billing sandbox core: ok')
