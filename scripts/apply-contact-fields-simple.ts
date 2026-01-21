/**
 * Script simplificado para adicionar campos de contato à tabela tenants
 * Executa os comandos SQL um por um
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Variáveis de ambiente não encontradas!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log("🔍 Testando conexão com Supabase...\n");

  try {
    // Tenta fazer uma query simples
    const { data, error } = await supabase
      .from("tenants")
      .select("id, business_name")
      .limit(1);

    if (error) {
      console.error("❌ Erro na conexão:", error.message);
      return false;
    }

    console.log("✅ Conexão estabelecida!");
    console.log(`📊 Encontrado ${data?.length || 0} tenant(s)\n`);
    return true;
  } catch (err) {
    console.error("❌ Erro:", err);
    return false;
  }
}

async function checkIfColumnsExist() {
  console.log("🔍 Verificando se as colunas já existem...\n");

  try {
    const { data, error } = await supabase
      .from("tenants")
      .select("phone, email, description, settings")
      .limit(1);

    if (!error) {
      console.log("✅ As colunas JÁ EXISTEM!");
      console.log("   - phone ✓");
      console.log("   - email ✓");
      console.log("   - description ✓");
      console.log("   - settings ✓");
      console.log("\n🎉 Migration já foi aplicada anteriormente.\n");
      return true;
    }

    // Se deu erro, pode ser que as colunas não existam
    console.log("⚠️  Colunas não encontradas. Precisam ser criadas.\n");
    return false;
  } catch (err) {
    console.log("⚠️  Erro ao verificar colunas:", err);
    return false;
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  Migration: Adicionar Campos de Contato (WhatsApp)    ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // 1. Testa conexão
  const connected = await testConnection();
  if (!connected) {
    console.log("\n❌ Não foi possível conectar ao Supabase.");
    console.log("   Verifique suas variáveis de ambiente.\n");
    process.exit(1);
  }

  // 2. Verifica se as colunas já existem
  const columnsExist = await checkIfColumnsExist();
  
  if (columnsExist) {
    console.log("✅ Nada a fazer! As colunas já estão no banco.\n");
    process.exit(0);
  }

  // 3. Se não existem, precisa aplicar manualmente
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  ⚠️  AÇÃO NECESSÁRIA                                   ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");
  
  console.log("📋 Siga os passos abaixo para aplicar a migration:\n");
  console.log("1️⃣  Acesse o Dashboard do Supabase:");
  console.log(`    ${SUPABASE_URL.replace('/rest/v1', '')}\n`);
  
  console.log("2️⃣  Vá em: SQL Editor → New Query\n");
  
  console.log("3️⃣  Cole o SQL abaixo:\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.phone IS 'Telefone/WhatsApp do dono da arena';
COMMENT ON COLUMN public.tenants.email IS 'E-mail de contato da arena';
COMMENT ON COLUMN public.tenants.description IS 'Descrição da arena';
COMMENT ON COLUMN public.tenants.settings IS 'Configurações em JSON';

CREATE INDEX IF NOT EXISTS idx_tenants_phone ON public.tenants(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email) WHERE email IS NOT NULL;

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS check_phone_format;
ALTER TABLE public.tenants ADD CONSTRAINT check_phone_format CHECK (
  phone IS NULL OR phone ~ '^[0-9]{10,13}$'
);

ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS check_email_format;
ALTER TABLE public.tenants ADD CONSTRAINT check_email_format CHECK (
  email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
);
  `);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log("4️⃣  Clique em 'Run' para executar\n");
  
  console.log("5️⃣  Execute este script novamente para verificar:");
  console.log("    bun run scripts/apply-contact-fields-simple.ts\n");
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main();
