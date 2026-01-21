/**
 * Script de Consultas Seguras - APENAS SELECT
 * 
 * ⚠️ ATENÇÃO: Este script NUNCA executa DROP, DELETE, TRUNCATE, RESET ou qualquer comando destrutivo
 * Apenas consultas SELECT para verificar dados
 * 
 * Uso:
 *   bun run scripts/test-queries-safe.ts
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cores para output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command: string): string {
	try {
		const output = execSync(command, { 
			encoding: 'utf-8',
			stdio: 'pipe'
		});
		return output;
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
		throw new Error(`Erro ao executar: ${command}\n${errorMessage}`);
	}
}

async function main() {
	console.log('\n' + '='.repeat(60));
	log('🔍 CONSULTAS SEGURAS - ARENA SPORTS', 'bright');
	log('⚠️  APENAS SELECT - NENHUM COMANDO DESTRUTIVO', 'yellow');
	console.log('='.repeat(60) + '\n');

	// Não precisa estar linkado - apenas mostra as queries para copiar
	log('💡 Este script mostra queries SQL seguras para executar no SQL Editor', 'yellow');
	log('📋 Copie e cole cada query no SQL Editor do Supabase Dashboard', 'blue');

	// Consultas seguras
	const queries = [
		{
			name: '1. Verificar Timezone das Reservas',
			sql: `
SELECT 
  customer_name,
  start_time,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS hora_brasil,
  EXTRACT(HOUR FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) AS hora,
  EXTRACT(MINUTE FROM (start_time AT TIME ZONE 'America/Sao_Paulo')) AS minuto
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
  'Na publicacao' as status
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
			name: '4. Verificar Campos de Endereço (Tenants)',
			sql: `
SELECT 
  business_name,
  cep,
  street,
  city,
  state,
  CASE 
    WHEN cep IS NOT NULL THEN 'Tem CEP'
    WHEN address IS NOT NULL THEN 'Tem endereco antigo'
    ELSE 'Sem endereco'
  END as status_endereco
FROM tenants
ORDER BY business_name
LIMIT 10;
			`.trim()
		},
		{
			name: '5. Verificar Campos de Contato (Tenants)',
			sql: `
SELECT 
  business_name,
  phone,
  email,
  CASE 
    WHEN phone IS NOT NULL THEN 'Tem telefone'
    ELSE 'Sem telefone'
  END as status_telefone
FROM tenants
ORDER BY business_name
LIMIT 10;
			`.trim()
		},
		{
			name: '6. Reservas com Status Tracking',
			sql: `
SELECT 
  customer_name,
  start_time AT TIME ZONE 'America/Sao_Paulo' AS hora_brasil,
  status,
  started_at,
  completed_at,
  cancelled_at,
  CASE 
    WHEN started_at IS NOT NULL AND completed_at IS NULL THEN 'Em andamento'
    WHEN completed_at IS NOT NULL THEN 'Finalizado'
    WHEN cancelled_at IS NOT NULL THEN 'Cancelado'
    ELSE 'Nao iniciado'
  END as estado_jogo
FROM bookings
WHERE start_time >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY start_time DESC
LIMIT 10;
			`.trim()
		},
		{
			name: '7. Verificar Constraints de Status (Bookings)',
			sql: `
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definicao
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
AND conname = 'bookings_status_check';
			`.trim()
		},
		{
			name: '8. Verificar Overlap Constraint (Bookings)',
			sql: `
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as definicao
FROM pg_constraint
WHERE conrelid = 'public.bookings'::regclass
AND conname = 'bookings_no_overlap_active';
			`.trim()
		},
		{
			name: '9. Últimas Reservas Criadas',
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
			name: '10. Verificar View de Estatísticas',
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

	// Executa cada consulta
	for (const query of queries) {
		console.log('\n' + '-'.repeat(60));
		log(query.name, 'blue');
		console.log('-'.repeat(60));
		
		// Tenta executar via Supabase REST API (se possível)
		// Para queries complexas, mostra SQL para copiar
		log('📋 SQL para executar:', 'yellow');
		console.log('\n' + query.sql + '\n');
		
		// Se for uma query simples (SELECT de uma tabela), tenta executar
		if (query.sql.match(/^SELECT\s+.*\s+FROM\s+(\w+)/i)) {
			const tableMatch = query.sql.match(/FROM\s+(\w+)/i);
			if (tableMatch) {
				const tableName = tableMatch[1];
				log(`💡 Query simples detectada (tabela: ${tableName})`, 'blue');
				log('   Para executar via CLI, use: bun run scripts/run-queries-cli.ts', 'yellow');
			}
		}
		
		log('💡 Copie o SQL acima e cole no SQL Editor do Supabase Dashboard', 'blue');
	}

	console.log('\n' + '='.repeat(60));
	log('✅ Consultas concluídas!', 'green');
	log('💡 Para executar manualmente, copie o SQL acima e cole no SQL Editor', 'yellow');
	console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
