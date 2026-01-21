/**
 * Script rápido para aplicar migrations
 * Apenas executa: bunx supabase db push
 * 
 * Uso:
 *   bun run db:push
 */

import { execSync } from 'child_process';

console.log('\n📤 Aplicando migrations ao Supabase...\n');

try {
  execSync('bunx supabase db push', { 
    stdio: 'inherit',
    encoding: 'utf-8'
  });
  
  console.log('\n✅ Migrations aplicadas com sucesso!\n');
} catch (error) {
  console.error('\n❌ Erro ao aplicar migrations');
  console.log('\n💡 Certifique-se de que:');
  console.log('   1. O projeto está linkado: bun run db:setup');
  console.log('   2. Você tem acesso ao banco de dados');
  console.log('   3. As migrations estão em: supabase/migrations/\n');
  process.exit(1);
}
