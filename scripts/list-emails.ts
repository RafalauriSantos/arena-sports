
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Carregar variáveis de ambiente
const envFile = existsSync(resolve(process.cwd(), '.env.local'))
  ? '.env.local'
  : existsSync(resolve(process.cwd(), '.env'))
  ? '.env'
  : null;

if (envFile) {
  config({ path: envFile });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function listEmails() {
  console.log('\n📧 CONSULTANDO EMAILS CADASTRADOS...\n');
  console.log('='.repeat(70));

  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('email, full_name, created_at, tenant_id, id', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao consultar:', error.message);
      return;
    }

    console.log(`\n✅ Total de usuários cadastrados: ${count || data?.length || 0}\n`);

    if (!data || data.length === 0) {
      console.log('Nenhum email encontrado.');
      return;
    }

    console.log('📋 LISTA DE EMAILS:\n');
    data.forEach((profile, index) => {
      const email = profile.email || '❌ Sem email';
      const name = profile.full_name || 'Sem nome';
      const date = profile.created_at 
        ? new Date(profile.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Data não disponível';
      
      console.log(`${index + 1}. ${email}`);
      console.log(`   Nome: ${name}`);
      console.log(`   Cadastrado em: ${date}`);
      console.log(`   Tenant ID: ${profile.tenant_id || 'N/A'}`);
      console.log('');
    });

    console.log('='.repeat(70));
    console.log(`\n✅ Consulta concluída. Total: ${data.length} usuário(s)\n`);

  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

listEmails();
