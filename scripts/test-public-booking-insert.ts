/**
 * Script para testar e diagnosticar o problema de INSERT público de reservas
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
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPublicBookingInsert() {
	console.log('\n' + '='.repeat(60));
	console.log('🧪 TESTE: INSERT PÚBLICO DE RESERVA');
	console.log('='.repeat(60) + '\n');

	// 1. Buscar um tenant público com subdomain
	console.log('1️⃣ Buscando tenant público...');
	const { data: tenants, error: tenantError } = await supabase
		.from('tenants')
		.select('id, business_name, subdomain')
		.not('subdomain', 'is', null)
		.limit(1);

	if (tenantError || !tenants || tenants.length === 0) {
		console.error('❌ Erro ao buscar tenant:', tenantError);
		return;
	}

	const tenant = tenants[0];
	console.log('✅ Tenant encontrado:', tenant.business_name, `(${tenant.subdomain})`);

	// 2. Buscar uma quadra ativa desse tenant
	console.log('\n2️⃣ Buscando quadra ativa...');
	const { data: courts, error: courtError } = await supabase
		.from('courts')
		.select('id, name, active, tenant_id')
		.eq('tenant_id', tenant.id)
		.eq('active', true)
		.limit(1);

	if (courtError || !courts || courts.length === 0) {
		console.error('❌ Erro ao buscar quadra:', courtError);
		return;
	}

	const court = courts[0];
	console.log('✅ Quadra encontrada:', court.name);

	// 3. Testar as funções de validação
	console.log('\n3️⃣ Testando funções de validação...');
	
	const { data: isPublic, error: isPublicError } = await supabase.rpc('fn_is_public_tenant', {
		p_tenant_id: tenant.id
	});
	console.log('   fn_is_public_tenant:', isPublic, isPublicError ? `(erro: ${isPublicError.message})` : '');

	const { data: isActiveCourt, error: isActiveError } = await supabase.rpc('fn_is_active_court_for_tenant', {
		p_court_id: court.id,
		p_tenant_id: tenant.id
	});
	console.log('   fn_is_active_court_for_tenant:', isActiveCourt, isActiveError ? `(erro: ${isActiveError.message})` : '');

	// 4. Tentar criar uma reserva de teste
	console.log('\n4️⃣ Tentando criar reserva pública...');
	
	const now = new Date();
	const startTime = new Date(now);
	startTime.setHours(now.getHours() + 2, 0, 0, 0);
	
	const endTime = new Date(startTime);
	endTime.setHours(startTime.getHours() + 1);

	const bookingData = {
		court_id: court.id,
		tenant_id: tenant.id,
		start_time: startTime.toISOString(),
		end_time: endTime.toISOString(),
		customer_name: 'Teste Público',
		customer_phone: '11999999999',
		status: 'pending_payment',
		total_price: 100.00,
		notes: 'Reserva de teste via script'
	};

	console.log('   Dados da reserva:', JSON.stringify(bookingData, null, 2));

	const { data: booking, error: bookingError } = await supabase
		.from('bookings')
		.insert(bookingData)
		.select()
		.single();

	if (bookingError) {
		console.error('❌ Erro ao criar reserva:', bookingError);
		console.error('   Código:', bookingError.code);
		console.error('   Mensagem:', bookingError.message);
		console.error('   Detalhes:', bookingError.details);
		console.error('   Hint:', bookingError.hint);
	} else {
		console.log('✅ Reserva criada com sucesso!');
		console.log('   ID:', booking.id);
		
		// Limpar a reserva de teste
		console.log('\n5️⃣ Limpando reserva de teste...');
		await supabase
			.from('bookings')
			.delete()
			.eq('id', booking.id);
		console.log('✅ Reserva de teste removida');
	}
}

testPublicBookingInsert().catch(console.error);
