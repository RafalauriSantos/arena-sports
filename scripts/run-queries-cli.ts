/**
 * Script para Executar Queries SQL via Supabase REST API
 * 
 * ⚠️ ATENÇÃO: APENAS SELECT - Nenhum comando destrutivo
 * 
 * Este script usa a API REST do Supabase para executar queries SQL
 * através do endpoint RPC (mais seguro que SQL direto)
 * 
 * Uso:
 *   bun run scripts/run-queries-cli.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { resolve } from 'path';

// Carrega .env.local se existir
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	console.error('❌ VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados');
	console.error('💡 Configure no arquivo .env.local');
	process.exit(1);
}

// Cria cliente com service role (tem permissões de admin)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

// Cores
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

async function executeQuery(queryName: string, sql: string) {
	console.log('\n' + '-'.repeat(60));
	log(queryName, 'blue');
	console.log('-'.repeat(60));
	
	// Valida que é apenas SELECT
	const sqlUpper = sql.trim().toUpperCase();
	if (!sqlUpper.startsWith('SELECT')) {
		log('❌ ERRO: Apenas queries SELECT são permitidas', 'red');
		return;
	}

	// Remove comandos perigosos mesmo em comentários
	const dangerous = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER TABLE', 'CREATE TABLE', 'INSERT', 'UPDATE', 'RESET'];
	if (dangerous.some(cmd => sqlUpper.includes(cmd))) {
		log('❌ ERRO: Query contém comandos perigosos', 'red');
		return;
	}

	try {
		// Usa RPC para executar query SQL
		// Nota: Supabase não tem um RPC genérico para SQL arbitrário por segurança
		// Vamos usar uma abordagem diferente: mostrar a query para copiar
		
		log('📋 Query SQL:', 'cyan');
		console.log('\n' + sql + '\n');
		
		log('💡 Para executar:', 'yellow');
		log('   1. Acesse: https://supabase.com/dashboard/project/extkyeckajhcozjervyr', 'blue');
		log('   2. Vá em SQL Editor → New Query', 'blue');
		log('   3. Cole a query acima e execute (Run)', 'blue');
		
		// Alternativa: tentar usar a API REST diretamente (limitado)
		// Mas isso requer criar uma função SQL no banco, o que não é ideal
		
	} catch (error: any) {
		log(`❌ Erro: ${error.message}`, 'red');
	}
}

async function main() {
	console.log('\n' + '='.repeat(60));
	log('🔍 EXECUTAR QUERIES SQL - ARENA SPORTS', 'bright');
	log('⚠️  APENAS SELECT - NENHUM COMANDO DESTRUTIVO', 'yellow');
	console.log('='.repeat(60) + '\n');

	// Queries de teste
	const queries = [
		{
			name: '1. Verificar Timezone das Reservas',
			sql: `
SELECT 
  customer_name,
  start_time,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS hora_brasil,
  EXTRACT(HOUR FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) AS hora,
  EXTRACT(MINUTE FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) AS minuto,
  status
FROM bookings
WHERE DATE(start_time) >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 10;
			`.trim()
		},
		{
			name: '2. Verificar Replication (Real-time)',
			sql: `
SELECT 
  schemaname,
  tablename,
  'Na publicacao supabase_realtime' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename IN ('bookings', 'courts', 'tenants')
ORDER BY tablename;
			`.trim()
		},
		{
			name: '3. Estatísticas de Reservas (Últimos 7 dias)',
			sql: `
SELECT 
  DATE(start_time AT TIME ZONE 'America/Sao_Paulo') as data,
  COUNT(*) as total_reservas,
  COUNT(*) FILTER (WHERE status = 'completed') as finalizadas,
  COUNT(*) FILTER (WHERE status = 'in_progress') as em_andamento,
  COUNT(*) FILTER (WHERE status = 'cancelled') as canceladas,
  SUM(total_price) FILTER (WHERE status = 'completed') as receita_finalizadas
FROM bookings
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(start_time AT TIME ZONE 'America/Sao_Paulo')
ORDER BY data DESC;
			`.trim()
		},
		{
			name: '4. Últimas Reservas Criadas',
			sql: `
SELECT 
  customer_name,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS hora_brasil,
  status,
  total_price,
  created_at AT TIME ZONE 'America/Sao_Paulo' AS criado_em
FROM bookings
ORDER BY created_at DESC
LIMIT 5;
			`.trim()
		},
		{
			name: '5. Verificar View de Estatísticas',
			sql: `
SELECT 
  booking_date,
  completed_count,
  in_progress_count,
  pending_count,
  cancelled_count,
  completed_revenue
FROM v_booking_stats
WHERE booking_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY booking_date DESC
LIMIT 7;
			`.trim()
		}
	];

	// Executa cada query
	for (const query of queries) {
		await executeQuery(query.name, query.sql);
	}

	console.log('\n' + '='.repeat(60));
	log('✅ Consultas concluídas!', 'green');
	log('💡 Para executar, copie as queries acima e cole no SQL Editor', 'yellow');
	console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
