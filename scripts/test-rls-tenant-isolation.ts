import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'

const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : existsSync(resolve(process.cwd(), '.env'))
    ? '.env'
    : null

if (envFile) {
  config({ path: envFile })
}

type TestResult = {
  name: string
  passed: boolean
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

type PublicTenant = {
  id: string
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios')
  process.exit(1)
}

const admin = createClient(supabaseUrl, serviceKey)
const anon = createClient(supabaseUrl, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
const stamp = Date.now()
const password = 'Test123456!'
const results: TestResult[] = []

const ids: {
  userA?: string
  userB?: string
  tenantA?: string
  tenantB?: string
  courtA?: string
  courtB?: string
  bookingA?: string
  bookingB?: string
} = {}

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message)
  }
  return JSON.stringify(error)
}

function pass(name: string, message: string, severity: TestResult['severity'] = 'critical') {
  results.push({ name, passed: true, message, severity })
  console.log(`✅ ${name}: ${message}`)
}

function fail(name: string, message: string, severity: TestResult['severity'] = 'critical') {
  results.push({ name, passed: false, message, severity })
  console.log(`❌ ${name}: ${message}`)
}

function authedClient(accessToken: string) {
  return createClient(supabaseUrl!, anonKey!, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}

async function createUser(email: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  if (error || !data.user) throw error || new Error('usuario nao criado')
  return data.user.id
}

async function signIn(email: string) {
  const authClient = createClient(supabaseUrl!, anonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw error || new Error('login falhou')
  return data.session.access_token
}

async function setup() {
  const emailA = `rls-a-${stamp}@example.com`
  const emailB = `rls-b-${stamp}@example.com`

  ids.userA = await createUser(emailA)
  ids.userB = await createUser(emailB)

  const { data: tenantA, error: tenantAError } = await admin
    .from('tenants')
    .insert({
      owner_id: ids.userA,
      business_name: `RLS Tenant A ${stamp}`,
      subdomain: `rls-a-${stamp}`
    })
    .select('id')
    .single()
  if (tenantAError || !tenantA) throw tenantAError || new Error('tenant A nao criado')
  ids.tenantA = tenantA.id

  const { data: tenantB, error: tenantBError } = await admin
    .from('tenants')
    .insert({
      owner_id: ids.userB,
      business_name: `RLS Tenant B ${stamp}`,
      subdomain: `rls-b-${stamp}`
    })
    .select('id')
    .single()
  if (tenantBError || !tenantB) throw tenantBError || new Error('tenant B nao criado')
  ids.tenantB = tenantB.id

  const { error: profileError } = await admin.from('profiles').upsert([
    { id: ids.userA, tenant_id: ids.tenantA, email: emailA, full_name: 'RLS User A' },
    { id: ids.userB, tenant_id: ids.tenantB, email: emailB, full_name: 'RLS User B' }
  ])
  if (profileError) throw profileError

  const { data: courts, error: courtsError } = await admin
    .from('courts')
    .insert([
      { tenant_id: ids.tenantA, name: `RLS Court A ${stamp}`, base_price: 100, active: true },
      { tenant_id: ids.tenantB, name: `RLS Court B ${stamp}`, base_price: 100, active: true }
    ])
    .select('id, tenant_id')
  if (courtsError || !courts || courts.length !== 2) throw courtsError || new Error('quadras nao criadas')

  ids.courtA = courts.find((court) => court.tenant_id === ids.tenantA)?.id
  ids.courtB = courts.find((court) => court.tenant_id === ids.tenantB)?.id
  if (!ids.courtA || !ids.courtB) throw new Error('ids de quadra ausentes')

  const startA = new Date(Date.UTC(2030, 0, 1, 10, 0, 0)).toISOString()
  const endA = new Date(Date.UTC(2030, 0, 1, 11, 0, 0)).toISOString()
  const startB = new Date(Date.UTC(2030, 0, 1, 12, 0, 0)).toISOString()
  const endB = new Date(Date.UTC(2030, 0, 1, 13, 0, 0)).toISOString()

  const { data: bookings, error: bookingsError } = await admin
    .from('bookings')
    .insert([
      {
        tenant_id: ids.tenantA,
        court_id: ids.courtA,
        customer_name: 'Cliente A',
        customer_phone: '11999999999',
        start_time: startA,
        end_time: endA,
        total_price: 100,
        status: 'pending'
      },
      {
        tenant_id: ids.tenantB,
        court_id: ids.courtB,
        customer_name: 'Cliente B',
        customer_phone: '11888888888',
        start_time: startB,
        end_time: endB,
        total_price: 100,
        status: 'pending'
      }
    ])
    .select('id, tenant_id')
  if (bookingsError || !bookings || bookings.length !== 2) throw bookingsError || new Error('reservas nao criadas')

  ids.bookingA = bookings.find((booking) => booking.tenant_id === ids.tenantA)?.id
  ids.bookingB = bookings.find((booking) => booking.tenant_id === ids.tenantB)?.id
  if (!ids.bookingA || !ids.bookingB) throw new Error('ids de reserva ausentes')

  return {
    userA: authedClient(await signIn(emailA))
  }
}

async function cleanup() {
  if (ids.bookingA || ids.bookingB) {
    await admin.from('bookings').delete().in('id', [ids.bookingA, ids.bookingB].filter(Boolean))
  }
  if (ids.courtA || ids.courtB) {
    await admin.from('courts').delete().in('id', [ids.courtA, ids.courtB].filter(Boolean))
  }
  if (ids.userA || ids.userB) {
    await admin.from('profiles').delete().in('id', [ids.userA, ids.userB].filter(Boolean))
  }
  if (ids.userA) await admin.auth.admin.deleteUser(ids.userA)
  if (ids.userB) await admin.auth.admin.deleteUser(ids.userB)
  if (ids.tenantA || ids.tenantB) {
    await admin.from('tenants').delete().in('id', [ids.tenantA, ids.tenantB].filter(Boolean))
  }
}

async function expectNoRows(
  client: SupabaseClient,
  name: string,
  query: PromiseLike<{ data: unknown[] | null; error: unknown }>
) {
  const { data, error } = await query
  if (error) {
    pass(name, `bloqueado por erro de permissao: ${messageOf(error)}`)
    return
  }
  if (!data || data.length === 0) {
    pass(name, 'nenhuma linha cross-tenant retornada')
    return
  }
  fail(name, `${data.length} linha(s) cross-tenant retornada(s)`)
}

async function runTests(userA: SupabaseClient) {
  await expectNoRows(
    userA,
    'SELECT bookings de outro tenant',
    userA.from('bookings').select('id, tenant_id').eq('tenant_id', ids.tenantB!)
  )

  await expectNoRows(
    userA,
    'SELECT courts de outro tenant',
    userA.from('courts').select('id, tenant_id').eq('tenant_id', ids.tenantB!)
  )

  const { error: mutateProfileTenantError } = await userA
    .from('profiles')
    .update({ tenant_id: ids.tenantB })
    .eq('id', ids.userA!)
  if (mutateProfileTenantError) {
    pass('Bloqueia troca de profiles.tenant_id', messageOf(mutateProfileTenantError))
  } else {
    fail('Bloqueia troca de profiles.tenant_id', 'update de tenant_id foi aceito')
  }

  const { error: superAdminError } = await userA
    .from('profiles')
    .update({ is_super_admin: true })
    .eq('id', ids.userA!)
  if (superAdminError) {
    pass('Bloqueia escalada de profiles.is_super_admin', messageOf(superAdminError))
  } else {
    fail('Bloqueia escalada de profiles.is_super_admin', 'update de is_super_admin foi aceito')
  }

  const { error: mutateBookingTenantError } = await userA
    .from('bookings')
    .update({ tenant_id: ids.tenantB })
    .eq('id', ids.bookingA!)
  if (mutateBookingTenantError) {
    pass('Bloqueia troca de bookings.tenant_id', messageOf(mutateBookingTenantError))
  } else {
    fail('Bloqueia troca de bookings.tenant_id', 'update de tenant_id da reserva foi aceito')
  }

  const { error: updateOtherBookingError } = await userA
    .from('bookings')
    .update({ notes: 'cross tenant write attempt' })
    .eq('id', ids.bookingB!)
  if (updateOtherBookingError) {
    pass('Bloqueia UPDATE em booking de outro tenant', messageOf(updateOtherBookingError))
  } else {
    const { data } = await admin.from('bookings').select('notes').eq('id', ids.bookingB!).single()
    if (data?.notes === 'cross tenant write attempt') {
      fail('Bloqueia UPDATE em booking de outro tenant', 'booking B foi alterado')
    } else {
      pass('Bloqueia UPDATE em booking de outro tenant', 'nenhuma linha alterada')
    }
  }

  const { error: statsError } = await userA.rpc('fn_get_booking_stats_admin', {
    p_tenant_id: ids.tenantB
  })
  if (statsError) {
    pass('RPC stats admin bloqueia outro tenant', messageOf(statsError))
  } else {
    fail('RPC stats admin bloqueia outro tenant', 'RPC retornou dados de outro tenant')
  }

  const { error: startOtherError } = await userA.rpc('fn_start_booking', {
    p_booking_id: ids.bookingB
  })
  if (startOtherError) {
    pass('RPC start_booking bloqueia outro tenant', messageOf(startOtherError))
  } else {
    fail('RPC start_booking bloqueia outro tenant', 'RPC permitiu iniciar booking de outro tenant')
  }

  const { error: completeOtherError } = await userA.rpc('fn_complete_booking', {
    p_booking_id: ids.bookingB
  })
  if (completeOtherError) {
    pass('RPC complete_booking bloqueia outro tenant', messageOf(completeOtherError))
  } else {
    fail('RPC complete_booking bloqueia outro tenant', 'RPC permitiu finalizar booking de outro tenant')
  }

  await expectNoRows(
    userA,
    'View v_booking_stats bloqueia outro tenant',
    userA.from('v_booking_stats').select('tenant_id').eq('tenant_id', ids.tenantB!)
  )

  const { error: publicViewError, data: publicViewData } = await anon
    .from('public_bookings_view')
    .select('id')
    .limit(1)
  if (publicViewError || !publicViewData || publicViewData.length === 0) {
    pass('View publica legada de bookings bloqueada', publicViewError ? messageOf(publicViewError) : 'sem linhas')
  } else {
    fail('View publica legada de bookings bloqueada', 'anon conseguiu ler public_bookings_view')
  }

  const { error: directCourtsError, data: directCourtsData } = await anon
    .from('courts')
    .select('id')
    .limit(1)
  if (directCourtsError || !directCourtsData || directCourtsData.length === 0) {
    pass('SELECT publico direto em courts bloqueado', directCourtsError ? messageOf(directCourtsError) : 'sem linhas', 'medium')
  } else {
    fail('SELECT publico direto em courts bloqueado', 'anon conseguiu enumerar courts diretamente', 'medium')
  }

  const { error: publicCourtsViewError, data: publicCourtsViewData } = await anon
    .from('public_courts_view')
    .select('id')
    .limit(1)
  if (publicCourtsViewError || !publicCourtsViewData || publicCourtsViewData.length === 0) {
    pass('View publica legada de courts bloqueada', publicCourtsViewError ? messageOf(publicCourtsViewError) : 'sem linhas', 'medium')
  } else {
    fail('View publica legada de courts bloqueada', 'anon conseguiu ler public_courts_view', 'medium')
  }

  const { error: directTenantsError, data: directTenantsData } = await anon
    .from('tenants')
    .select('id')
    .limit(1)
  if (directTenantsError || !directTenantsData || directTenantsData.length === 0) {
    pass('SELECT publico direto em tenants bloqueado', directTenantsError ? messageOf(directTenantsError) : 'sem linhas', 'medium')
  } else {
    fail('SELECT publico direto em tenants bloqueado', 'anon conseguiu enumerar tenants diretamente', 'medium')
  }

  const { data: publicTenant, error: publicTenantError } = await anon
    .rpc('fn_public_get_tenant_by_subdomain', { p_subdomain: `rls-b-${stamp}` })
    .maybeSingle()
  const publicTenantRow = publicTenant as PublicTenant | null
  if (!publicTenantError && publicTenantRow && publicTenantRow.id === ids.tenantB) {
    pass('RPC publica de tenant preserva link externo', 'tenant retornado por subdominio', 'medium')
  } else {
    fail('RPC publica de tenant preserva link externo', messageOf(publicTenantError), 'medium')
  }

  const { data: publicCourts, error: publicCourtsError } = await anon.rpc(
    'fn_public_get_courts_by_subdomain',
    { p_subdomain: `rls-b-${stamp}` }
  )
  if (!publicCourtsError && Array.isArray(publicCourts) && publicCourts.some((court) => court.id === ids.courtB)) {
    pass('RPC publica de courts preserva link externo', 'quadras ativas retornadas por subdominio', 'medium')
  } else {
    fail('RPC publica de courts preserva link externo', messageOf(publicCourtsError), 'medium')
  }

  const { error: avatarListError, data: avatarList } = await anon.storage
    .from('avatars')
    .list('', { limit: 1 })
  if (avatarListError || !avatarList || avatarList.length === 0) {
    pass('Storage avatars nao permite listagem publica', avatarListError ? messageOf(avatarListError) : 'sem objetos listados', 'high')
  } else {
    fail('Storage avatars nao permite listagem publica', 'anon conseguiu listar objetos do bucket avatars', 'high')
  }

  const { data: ownStats, error: ownStatsError } = await userA.rpc('fn_get_booking_stats_admin', {
    p_tenant_id: ids.tenantA
  })
  if (!ownStatsError && ownStats) {
    pass('RPC stats admin permite tenant proprio', 'dados do tenant proprio retornados')
  } else {
    fail('RPC stats admin permite tenant proprio', messageOf(ownStatsError), 'high')
  }
}

async function main() {
  console.log('🔐 Auditoria automatizada RLS multi-tenant')
  try {
    const { userA } = await setup()
    await runTests(userA)
  } finally {
    await cleanup()
  }

  const failed = results.filter((result) => !result.passed)
  const criticalFailed = failed.filter((result) => result.severity === 'critical')

  console.log('\nResumo RLS:')
  for (const result of results) {
    console.log(`${result.passed ? '✅' : '❌'} [${result.severity}] ${result.name}: ${result.message}`)
  }

  if (failed.length > 0) {
    console.error(`\nNO-GO: ${failed.length} falha(s), ${criticalFailed.length} critica(s).`)
    process.exit(1)
  }

  console.log('\nGO técnico para isolamento RLS testado.')
}

main().catch(async (error) => {
  console.error('Erro fatal na auditoria RLS:', messageOf(error))
  await cleanup()
  process.exit(1)
})
