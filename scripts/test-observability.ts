import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createRequestContext,
  logEvent,
  sanitizeForLog,
} from '../supabase/functions/_shared/observability.ts'

type CapturedLog = {
  method: 'log' | 'warn' | 'error'
  line: string
}

const activeEdgeEntrypoints = [
  'supabase/functions/asaas-create-checkout/index.ts',
  'supabase/functions/asaas-webhook/index.ts',
  'supabase/functions/ensure-tenant-subscription/index.ts',
  'supabase/functions/asaas-manage-subscription/index.ts',
]

function captureConsole(run: () => void) {
  const captured: CapturedLog[] = []
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  }

  console.log = (line?: unknown) => captured.push({ method: 'log', line: String(line) })
  console.warn = (line?: unknown) => captured.push({ method: 'warn', line: String(line) })
  console.error = (line?: unknown) => captured.push({ method: 'error', line: String(line) })

  try {
    run()
  } finally {
    console.log = original.log
    console.warn = original.warn
    console.error = original.error
  }

  return captured
}

function testStructuredLogRedaction() {
  const req = new Request('https://example.com/functions/v1/asaas-webhook', {
    method: 'POST',
    headers: {
      'x-request-id': 'req_test_123',
      'x-correlation-id': 'corr_test_123',
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
      authorization: 'Bearer secret-value',
    },
  })

  const context = createRequestContext('test-function', req, {
    tenant_id: 'tenant_1',
    user_id: 'user_1',
    subscription_id: 'sub_1',
    payment_id: 'pay_1',
    booking_id: 'booking_1',
  })

  const logs = captureConsole(() => {
    logEvent(context, 'info', 'test_event', {
      access_token: 'asaas-secret',
      Authorization: 'Bearer should-not-appear',
      customer: {
        email: 'cliente@example.com',
        cpfCnpj: '12345678900',
        phone: '11999999999',
      },
      safe_counter: 1,
    })
  })

  assert.equal(logs.length, 1)
  assert.equal(logs[0].method, 'log')

  const parsed = JSON.parse(logs[0].line)
  assert.equal(parsed.level, 'info')
  assert.equal(parsed.event, 'test_event')
  assert.equal(parsed.request_id, 'req_test_123')
  assert.equal(parsed.correlation_id, 'corr_test_123')
  assert.equal(parsed.trace_id, '4bf92f3577b34da6a3ce929d0e0e4736')
  assert.equal(parsed.tenant_id, 'tenant_1')
  assert.equal(parsed.user_id, 'user_1')
  assert.equal(parsed.subscription_id, 'sub_1')
  assert.equal(parsed.payment_id, 'pay_1')
  assert.equal(parsed.booking_id, 'booking_1')
  assert.equal(typeof parsed.duration_ms, 'number')
  assert.equal(parsed.access_token, '[redacted]')
  assert.equal(parsed.Authorization, '[redacted]')
  assert.equal(parsed.customer, '[redacted]')
  assert.equal(parsed.safe_counter, 1)

  const serialized = logs[0].line
  assert.ok(!serialized.includes('asaas-secret'))
  assert.ok(!serialized.includes('should-not-appear'))
  assert.ok(!serialized.includes('cliente@example.com'))
  assert.ok(!serialized.includes('12345678900'))
  assert.ok(!serialized.includes('11999999999'))
}

function testSanitizeForLog() {
  const sanitized = sanitizeForLog({
    api_key: 'key',
    nested: {
      checkoutUrl: 'https://payment.example/link',
      payment_id: 'pay_visible',
    },
  })

  assert.equal(sanitized.api_key, '[redacted]')
  assert.deepEqual(sanitized.nested, {
    checkoutUrl: '[redacted]',
    payment_id: 'pay_visible',
  })
}

function testNoDirectConsoleInActiveEdgeFunctions() {
  for (const relativePath of activeEdgeEntrypoints) {
    const absolutePath = join(process.cwd(), relativePath)
    const source = readFileSync(absolutePath, 'utf8')
    assert.equal(
      /console\.(log|warn|error|debug)/.test(source),
      false,
      `${relativePath} must use _shared/observability.ts instead of console.*`
    )
    assert.equal(
      /Payload recebido|JSON\.stringify\(payload\)|Variáveis de ambiente disponíveis/.test(source),
      false,
      `${relativePath} must not log raw payloads or environment key lists`
    )
  }
}

function main() {
  testStructuredLogRedaction()
  testSanitizeForLog()
  testNoDirectConsoleInActiveEdgeFunctions()
  console.log('✅ Observability tests passed')
}

main()
