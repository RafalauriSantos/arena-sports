/**
 * Teste Automatizado: Verificar Mensagens de WhatsApp
 * 
 * Verifica se as mensagens estão formatadas corretamente (sem emojis problemáticos)
 * 
 * Uso:
 *   bun run scripts/test-whatsapp-messages.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Cores
const colors = {
	reset: '\x1b[0m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	red: '\x1b[31m',
	cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function extractWhatsAppMessages(content: string): string[] {
	const messages: string[] = [];
	
	// Procura por padrões como: const msg = `...` ou msg = `...` antes de window.open com wa.me
	// Também procura por template literals que são passados para encodeURIComponent dentro de wa.me
	
	// Padrão 1: const msg = `...` seguido de window.open com wa.me
	const pattern1 = /(?:const|let|var)\s+msg\s*=\s*`([^`]+)`/gs;
	let match;
	while ((match = pattern1.exec(content)) !== null) {
		// Verifica se há window.open com wa.me próximo
		const afterMatch = content.substring(match.index + match[0].length, match.index + match[0].length + 200);
		if (afterMatch.includes('wa.me') || afterMatch.includes('window.open')) {
			messages.push(match[1]);
		}
	}
	
	// Padrão 2: window.open com template literal direto
	const pattern2 = /window\.open\([^,]+,\s*[^)]*\)/gs;
	while ((match = pattern2.exec(content)) !== null) {
		const openCall = match[0];
		if (openCall.includes('wa.me')) {
			// Extrai o texto do template literal dentro de encodeURIComponent
			const textMatch = openCall.match(/encodeURIComponent\(`([^`]+)`\)/);
			if (textMatch) {
				messages.push(textMatch[1]);
			}
		}
	}
	
	return messages;
}

function checkFile(filePath: string, description: string) {
	try {
		const content = readFileSync(filePath, 'utf-8');
		
		// Extrai apenas as mensagens de WhatsApp
		const messages = extractWhatsAppMessages(content);
		
		if (messages.length === 0) {
			log(`\n📄 ${description}`, 'cyan');
			log(`   Arquivo: ${filePath}`, 'reset');
			log('   ⚠️  Nenhuma mensagem de WhatsApp encontrada', 'yellow');
			return null;
		}
		
		log(`\n📄 ${description}`, 'cyan');
		log(`   Arquivo: ${filePath}`, 'reset');
		log(`   Mensagens encontradas: ${messages.length}`, 'reset');
		
		// Verifica cada mensagem
		let allGood = true;
		const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
		const problematicAccents = /[áàâãéèêíìîóòôõúùûç]/gi;
		
		messages.forEach((msg, idx) => {
			const hasEmojis = emojiPattern.test(msg);
			const hasNewlines = msg.includes('\\n') || msg.includes('\n');
			const hasBoldFormat = msg.includes('*') && msg.match(/\*[^*]+\*/g);
			const hasProblematicAccents = problematicAccents.test(msg);
			
			if (messages.length > 1) {
				log(`\n   Mensagem ${idx + 1}:`, 'reset');
			}
			
			if (hasEmojis) {
				log('   ⚠️  Emojis Unicode encontrados', 'yellow');
				allGood = false;
			} else {
				log('   ✅ Sem emojis Unicode', 'green');
			}
			
			if (hasNewlines) {
				log('   ✅ Quebras de linha encontradas', 'green');
			} else {
				log('   ⚠️  Sem quebras de linha', 'yellow');
				allGood = false;
			}
			
			if (hasBoldFormat) {
				log('   ✅ Formatação em negrito (*texto*) encontrada', 'green');
			} else {
				log('   ⚠️  Sem formatação em negrito', 'yellow');
				allGood = false;
			}
			
			if (hasProblematicAccents) {
				log('   ⚠️  Acentos encontrados (podem quebrar no WhatsApp)', 'yellow');
				allGood = false;
			} else {
				log('   ✅ Sem acentos problemáticos', 'green');
			}
		});
		
		return {
			allGood,
			messagesCount: messages.length
		};
	} catch (error: any) {
		log(`   ❌ Erro ao ler arquivo: ${error.message}`, 'red');
		return null;
	}
}

async function main() {
	console.log('\n' + '='.repeat(60));
	log('🧪 TESTE AUTOMATIZADO: Mensagens de WhatsApp', 'cyan');
	console.log('='.repeat(60) + '\n');

	const results: Array<{ file: string; description: string; result: any }> = [];

	// 1. Verifica mensagem do calendário público
	const publicResult = checkFile(
		join(process.cwd(), 'src/pages/BookingPublic.tsx'),
		'1. Mensagem do Calendário Público'
	);
	if (publicResult) {
		results.push({ file: 'BookingPublic.tsx', description: 'Calendário Público', result: publicResult });
	}

	// 2. Verifica mensagem admin cria reserva
	const adminCreateResult = checkFile(
		join(process.cwd(), 'src/components/admin/NewBookingModal.tsx'),
		'2. Mensagem Admin Cria Reserva'
	);
	if (adminCreateResult) {
		results.push({ file: 'NewBookingModal.tsx', description: 'Admin Cria Reserva', result: adminCreateResult });
	}

	// 3. Verifica mensagem da agenda
	const agendaResult = checkFile(
		join(process.cwd(), 'src/pages/admin/AgendaMaster.tsx'),
		'3. Mensagem da Agenda'
	);
	if (agendaResult) {
		results.push({ file: 'AgendaMaster.tsx', description: 'Agenda', result: agendaResult });
	}

	// Resumo
	console.log('\n' + '='.repeat(60));
	log('📊 RESUMO', 'cyan');
	console.log('='.repeat(60));

	const allGood = results.every(r => r.result && r.result.allGood);

	if (allGood) {
		log('\n✅ Todas as mensagens estão formatadas corretamente!', 'green');
		log('   - Sem emojis Unicode', 'green');
		log('   - Com quebras de linha', 'green');
		log('   - Com formatação em negrito', 'green');
		log('   - Sem acentos problemáticos', 'green');
	} else {
		log('\n⚠️  Algumas mensagens podem precisar de ajustes:', 'yellow');
		results.forEach(r => {
			if (r.result && !r.result.allGood) {
				log(`   - ${r.description}`, 'yellow');
			}
		});
	}

	console.log('\n' + '='.repeat(60));
	log('💡 Próximo passo: Testar manualmente abrindo o WhatsApp', 'cyan');
	console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
