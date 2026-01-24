/**
 * Script de teste detalhado para inserção de reserva pública
 * Simula exatamente o que o frontend faz
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

// Cliente anônimo (simula usuário não autenticado)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function testPublicBookingInsert() {
  console.log('🔍 [TEST] Iniciando teste de inserção de reserva pública...\n');

  // 1. Buscar um tenant público
  console.log('📡 [TEST] Buscando tenant público...');
  const { data: tenants, error: tenantError } = await supabase
    .from('tenants')
    .select('id, business_name, subdomain')
    .not('subdomain', 'is', null)
    .neq('subdomain', '')
    .limit(1);

  if (tenantError) {
    console.error('❌ [TEST] Erro ao buscar tenant:', tenantError);
    return;
  }

  if (!tenants || tenants.length === 0) {
    console.error('❌ [TEST] Nenhum tenant público encontrado');
    return;
  }

  const tenant = tenants[0];
  console.log('✅ [TEST] Tenant encontrado:', {
    id: tenant.id,
    name: tenant.business_name,
    subdomain: tenant.subdomain,
  });

  // 2. Buscar uma quadra ativa desse tenant
  console.log('\n📡 [TEST] Buscando quadra ativa...');
  const { data: courts, error: courtError } = await supabase
    .from('courts')
    .select('id, name, active')
    .eq('tenant_id', tenant.id)
    .eq('active', true)
    .limit(1);

  if (courtError) {
    console.error('❌ [TEST] Erro ao buscar quadra:', courtError);
    return;
  }

  if (!courts || courts.length === 0) {
    console.error('❌ [TEST] Nenhuma quadra ativa encontrada');
    return;
  }

  const court = courts[0];
  console.log('✅ [TEST] Quadra encontrada:', {
    id: court.id,
    name: court.name,
    active: court.active,
  });

  // 3. Preparar dados da reserva (simulando o frontend)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const endTime = new Date(tomorrow);
  endTime.setHours(11, 0, 0, 0);

  // Formatar com timezone (como o frontend faz)
  const timezoneOffset = tomorrow.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const offsetMinutes = Math.abs(timezoneOffset) % 60;
  const offsetSign = timezoneOffset <= 0 ? '+' : '-';
  const timezoneString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  const formatWithTimezone = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}${timezoneString}`;
  };

  const startTimestamp = formatWithTimezone(tomorrow);
  const endTimestamp = formatWithTimezone(endTime);

  const bookingData = {
    court_id: court.id,
    tenant_id: tenant.id,
    start_time: startTimestamp,
    end_time: endTimestamp,
    customer_name: 'Teste Automatizado',
    customer_phone: '11999999999',
    status: 'pending_payment',
    total_price: 100.0,
    notes: 'Reserva via calendário público - 60min - Pagar no balcão',
  };

  console.log('\n📋 [TEST] Dados da reserva a ser inserida:');
  console.log(JSON.stringify(bookingData, null, 2));

  // 4. Testar as funções security definer
  console.log('\n🔍 [TEST] Testando funções security definer...');
  
  const { data: isPublicTenant, error: fn1Error } = await supabase.rpc(
    'fn_is_public_tenant',
    { p_tenant_id: tenant.id }
  );
  
  if (fn1Error) {
    console.error('❌ [TEST] Erro ao chamar fn_is_public_tenant:', fn1Error);
  } else {
    console.log('✅ [TEST] fn_is_public_tenant:', isPublicTenant);
  }

  const { data: isActiveCourt, error: fn2Error } = await supabase.rpc(
    'fn_is_active_court_for_tenant',
    { p_court_id: court.id, p_tenant_id: tenant.id }
  );

  if (fn2Error) {
    console.error('❌ [TEST] Erro ao chamar fn_is_active_court_for_tenant:', fn2Error);
  } else {
    console.log('✅ [TEST] fn_is_active_court_for_tenant:', isActiveCourt);
  }

  const { data: isOwner, error: fn3Error } = await supabase.rpc(
    'fn_is_tenant_owner',
    { p_tenant_id: tenant.id }
  );

  if (fn3Error) {
    console.error('❌ [TEST] Erro ao chamar fn_is_tenant_owner:', fn3Error);
  } else {
    console.log('✅ [TEST] fn_is_tenant_owner (deve ser false para anon):', isOwner);
  }

  // 5. Tentar inserir a reserva
  console.log('\n🚀 [TEST] Tentando inserir reserva...');
  const { data: newBooking, error: insertError } = await supabase
    .from('bookings')
    .insert(bookingData)
    .select()
    .single();

  if (insertError) {
    console.error('\n❌ [TEST] ERRO AO INSERIR RESERVA:');
    console.error('   Código:', insertError.code);
    console.error('   Mensagem:', insertError.message);
    console.error('   Detalhes:', insertError.details);
    console.error('   Hint:', insertError.hint);
    
    // Verificar se é erro de RLS
    if (insertError.code === '42501') {
      console.error('\n⚠️ [TEST] Erro de RLS detectado!');
      console.error('   Isso significa que a política RLS está bloqueando a inserção.');
      console.error('   Verifique se:');
      console.error('   1. fn_is_public_tenant retorna true');
      console.error('   2. fn_is_active_court_for_tenant retorna true');
      console.error('   3. Todos os campos obrigatórios estão preenchidos');
      console.error('   4. status é "pending_payment"');
    }
  } else {
    console.log('\n✅ [TEST] RESERVA INSERIDA COM SUCESSO!');
    console.log('   ID:', newBooking?.id);
    console.log('   Status:', newBooking?.status);
    
    // Limpar a reserva de teste
    console.log('\n🧹 [TEST] Limpando reserva de teste...');
    await supabase
      .from('bookings')
      .delete()
      .eq('id', newBooking?.id);
    console.log('✅ [TEST] Reserva de teste removida');
  }
}

testPublicBookingInsert().catch(console.error);
