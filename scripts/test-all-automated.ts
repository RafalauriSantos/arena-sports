/**
 * Teste Automatizado Completo
 * 
 * Executa todos os testes automatizados possíveis
 * 
 * Uso:
 *   npx tsx scripts/test-all-automated.ts
 */

import { execSync } from 'child_process';
import { join } from 'path';

const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	cyan: '\x1b[36m',
	bright: '\x1b[1m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
	console.log('\n' + '='.repeat(60));
	log('🚀 TESTES AUTOMATIZADOS - ARENA SPORTS', 'bright');
	console.log('='.repeat(60) + '\n');

	const tests = [
		{
			name: '1. Estrutura do Banco de Dados',
			script: 'scripts/test-database-structure.ts',
			description: 'Verifica se colunas e views existem'
		},
		{
			name: '2. Mensagens de WhatsApp',
			script: 'scripts/test-whatsapp-messages.ts',
			description: 'Verifica formatação das mensagens'
		}
	];

	for (const test of tests) {
		log(`\n${test.name}`, 'cyan');
		log(`   ${test.description}`, 'reset');
		log('   Executando...\n', 'yellow');
		
		try {
			execSync(`npx tsx ${test.script}`, {
				stdio: 'inherit',
				cwd: process.cwd()
			});
			log(`\n   ✅ ${test.name} concluído`, 'green');
		} catch (error: unknown) {
			log(`\n   ⚠️  ${test.name} teve problemas`, 'yellow');
			const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
			log(`   Erro: ${errorMessage}`, 'yellow');
		}
	}

	console.log('\n' + '='.repeat(60));
	log('✅ Testes automatizados concluídos!', 'green');
	log('💡 Agora teste manualmente: WhatsApp, Timezone, Estatísticas', 'cyan');
	console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
