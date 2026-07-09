export type SandboxConfig = {
  supabaseUrl?: string
  anonKey?: string
  serviceRoleKey?: string
  asaasUrl?: string
  asaasKey?: string
  webhookToken?: string
  reconciliationToken?: string
}

export function isSandboxUrl(url: string | undefined): boolean {
  return Boolean(url && /sandbox\.asaas\.com/i.test(url))
}

export function mask(value: string | undefined): string {
  if (!value) return '<ausente>'
  if (value.length <= 8) return '<definido>'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export function validateSandboxConfig(config: SandboxConfig) {
  const errors: string[] = []
  const warnings: string[] = []
  if (!config.supabaseUrl) errors.push('VITE_SUPABASE_URL')
  if (!config.anonKey) errors.push('VITE_SUPABASE_ANON_KEY')
  if (!config.serviceRoleKey) errors.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!config.asaasKey) errors.push('ASAAS_API_KEY')
  if (!config.asaasUrl) errors.push('ASAAS_API_URL')
  if (config.asaasUrl && !isSandboxUrl(config.asaasUrl)) {
    errors.push('ASAAS_API_URL deve apontar para sandbox.asaas.com')
  }
  if (!config.webhookToken) warnings.push('TEST_ASAAS_WEBHOOK_TOKEN (webhook autorizado não será testado)')
  if (!config.reconciliationToken) warnings.push('BILLING_RECONCILIATION_TOKEN (reconciliação autorizada não será testada)')
  return { errors, warnings }
}

export function classifyHttp(status: number): 'pass' | 'blocked' | 'fail' {
  if (status >= 200 && status < 300) return 'pass'
  if (status === 400 || status === 401 || status === 403 || status === 409 || status === 422) return 'blocked'
  return 'fail'
}
