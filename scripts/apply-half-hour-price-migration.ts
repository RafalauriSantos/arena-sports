/**
 * Script para aplicar a migration de half_hour_price diretamente
 * 
 * Uso:
 *   bun run scripts/apply-half-hour-price-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import * as dotenv from 'dotenv';

// Carrega .env.local
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
	dotenv.config({ path: envPath });
}

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

async function main() {
	console.log('\n' + '='.repeat(60));
	log('📤 APLICAR MIGRATION: half_hour_price', 'bright');
	console.log('='.repeat(60) + '\n');

	// 1. Verificar variáveis de ambiente
	const supabaseUrl = process.env.VITE_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		log('❌ Variáveis de ambiente não encontradas', 'red');
		log('\n💡 Configure no .env.local:', 'yellow');
		log('   VITE_SUPABASE_URL=sua_url', 'cyan');
		log('   SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key', 'cyan');
		log('\n📋 Alternativa: Execute manualmente no SQL Editor do Supabase:', 'blue');
		
		const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260121000002_add_half_hour_price_to_courts.sql');
		if (existsSync(migrationPath)) {
			const sql = readFileSync(migrationPath, 'utf-8');
			console.log('\n' + sql + '\n');
		}
		
		process.exit(1);
	}

	// 2. Criar cliente Supabase com service role (permite ALTER TABLE)
	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});

	// 3. Ler migration
	const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20260121000002_add_half_hour_price_to_courts.sql');
	
	if (!existsSync(migrationPath)) {
		log('❌ Arquivo de migration não encontrado', 'red');
		log(`   Esperado em: ${migrationPath}`, 'yellow');
		process.exit(1);
	}

	const sql = readFileSync(migrationPath, 'utf-8');
	log('📄 Migration encontrada:', 'blue');
	log(`   ${migrationPath}\n`, 'cyan');

	// 4. Verificar se a coluna já existe (tentativa, mas provavelmente não funcionará)
	log('🔍 Verificando se a coluna já existe...', 'blue');
	
	let columnExists = false;
	try {
		// Tenta verificar via query direta (pode não funcionar sem RPC customizado)
		const { data, error } = await supabase
			.from('courts')
			.select('half_hour_price')
			.limit(1);
		
		if (!error && data !== null) {
			columnExists = true;
			log('✅ Coluna half_hour_price já existe!', 'green');
		}
	} catch (err) {
		// Esperado - a coluna não existe ainda
		log('ℹ️  Coluna não encontrada (isso é esperado)', 'blue');
	}

	// Método alternativo: usar query direta via REST (limitado)
	// Para ALTER TABLE, precisamos usar o SQL Editor ou psql
	log('\n⚠️  O Supabase REST API não permite ALTER TABLE diretamente', 'yellow');
	log('💡 Você precisa aplicar a migration manualmente:', 'blue');
	log('\n📋 Opção 1: SQL Editor do Supabase Dashboard', 'cyan');
	log('   1. Acesse: https://supabase.com/dashboard/project/[seu-project]/sql/new', 'cyan');
	log('   2. Cole o SQL abaixo:', 'cyan');
	log('   3. Clique em "Run"\n', 'cyan');
	
	console.log('─'.repeat(60));
	console.log(sql);
	console.log('─'.repeat(60));

	log('\n📋 Opção 2: Via CLI do Supabase', 'cyan');
	log('   bunx supabase db push', 'cyan');
	log('   ou', 'cyan');
	log('   bun run scripts/apply-migrations.ts\n', 'cyan');

	log('📋 Opção 3: Via psql (se configurado)', 'cyan');
	log('   psql "postgresql://postgres.[project]:[password]@[project].supabase.co:5432/postgres?sslmode=require"', 'cyan');
	log('   Depois cole o SQL acima\n', 'cyan');

	// Verifica novamente após instruções
	log('✅ Migration pronta para aplicar!', 'green');
	log('   Após aplicar, recarregue a página de configurações.\n', 'green');
}

main().catch((error) => {
	log(`\n❌ Erro: ${error.message}`, 'red');
	console.error(error);
	process.exit(1);
});
