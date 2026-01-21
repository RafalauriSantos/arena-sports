/**
 * Teste: Verificar se os campos de contato foram adicionados corretamente
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Variáveis de ambiente não encontradas!");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testContactFields() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  Teste: Campos de Contato WhatsApp na Tabela Tenants     ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  try {
    // 1. Testa autenticação
    console.log("🔐 Verificando autenticação...");
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      console.log("⚠️  Nenhuma sessão ativa encontrada.");
      console.log("   Execute este teste após fazer login no sistema.\n");
      
      // Tenta fazer uma query pública para verificar a estrutura
      console.log("🔍 Verificando estrutura das colunas (via query de teste)...\n");
      
      const { error: testError } = await supabase
        .from("tenants")
        .select("phone, email, description, settings")
        .limit(0); // Não retorna dados, só testa a estrutura
      
      if (testError) {
        if (testError.message.includes("column") && testError.message.includes("does not exist")) {
          console.log("❌ ERRO: Colunas ainda não existem!");
          console.log(`   Detalhes: ${testError.message}\n`);
          console.log("📋 Verifique se a migration foi aplicada corretamente no Dashboard do Supabase.\n");
          process.exit(1);
        } else {
          console.log("⚠️  Erro ao verificar (pode ser por RLS):", testError.message);
          console.log("   Isso é normal se você não estiver logado.\n");
        }
      } else {
        console.log("✅ Estrutura verificada! Colunas existem:");
        console.log("   - phone ✓");
        console.log("   - email ✓");
        console.log("   - description ✓");
        console.log("   - settings ✓\n");
      }
      
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
      console.log("🧪 TESTE COMPLETO:");
      console.log("   1. Faça login no sistema: http://localhost:5173/login");
      console.log("   2. Vá em: Configurações → Arena");
      console.log("   3. Preencha:");
      console.log("      - WhatsApp: 11999887766");
      console.log("      - E-mail: contato@arena.com");
      console.log("      - Descrição: Arena completa com 4 quadras");
      console.log("   4. Clique em 'Salvar Configurações'");
      console.log("   5. Verifique se salvou sem erros\n");
      
      return;
    }

    console.log("✅ Sessão ativa encontrada!\n");

    // 2. Busca o perfil do usuário
    console.log("👤 Buscando perfil do usuário...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.log("❌ Erro ao buscar perfil:", profileError?.message || "tenant_id não encontrado");
      process.exit(1);
    }

    console.log(`✅ Tenant ID: ${profile.tenant_id}\n`);

    // 3. Busca os dados do tenant
    console.log("🏢 Buscando dados do tenant...");
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, business_name, phone, email, description, settings, subdomain")
      .eq("id", profile.tenant_id)
      .single();

    if (tenantError) {
      console.log("❌ Erro ao buscar tenant:", tenantError.message);
      process.exit(1);
    }

    if (!tenant) {
      console.log("❌ Tenant não encontrado!");
      process.exit(1);
    }

    console.log("✅ Dados do tenant encontrados!\n");

    // 4. Exibe os dados
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║  📊 DADOS ATUAIS DO TENANT                                ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    console.log(`  🏢 Nome: ${tenant.business_name || "(não cadastrado)"}`);
    console.log(`  🌐 Subdomínio: ${tenant.subdomain || "(não cadastrado)"}`);
    console.log(`  📱 WhatsApp: ${tenant.phone || "(não cadastrado)"}`);
    console.log(`  📧 E-mail: ${tenant.email || "(não cadastrado)"}`);
    console.log(`  📝 Descrição: ${tenant.description || "(não cadastrado)"}`);
    console.log(`  ⚙️  Settings: ${tenant.settings ? JSON.stringify(tenant.settings).substring(0, 50) + "..." : "(vazio)"}`);
    console.log();

    // 5. Status
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║  ✅ RESULTADO DO TESTE                                    ║");
    console.log("╚═══════════════════════════════════════════════════════════╝\n");

    const allFieldsPresent = 
      Object.prototype.hasOwnProperty.call(tenant, 'phone') &&
      Object.prototype.hasOwnProperty.call(tenant, 'email') &&
      Object.prototype.hasOwnProperty.call(tenant, 'description') &&
      Object.prototype.hasOwnProperty.call(tenant, 'settings');

    if (allFieldsPresent) {
      console.log("✅ SUCESSO! Todas as colunas foram criadas:");
      console.log("   ✓ phone");
      console.log("   ✓ email");
      console.log("   ✓ description");
      console.log("   ✓ settings\n");

      const hasData = tenant.phone || tenant.email || tenant.description;
      
      if (hasData) {
        console.log("🎉 PERFEITO! Dados já cadastrados:");
        if (tenant.phone) console.log(`   ✓ WhatsApp configurado: ${tenant.phone}`);
        if (tenant.email) console.log(`   ✓ E-mail configurado: ${tenant.email}`);
        if (tenant.description) console.log(`   ✓ Descrição configurada`);
        console.log();
      } else {
        console.log("⚠️  AÇÃO NECESSÁRIA: Preencha os dados de contato:");
        console.log("   1. Vá em: Configurações → Arena");
        console.log("   2. Preencha WhatsApp, E-mail e Descrição");
        console.log("   3. Clique em 'Salvar Configurações'\n");
      }

      // Link público
      if (tenant.subdomain) {
        console.log("🔗 Link público da sua arena:");
        console.log(`   http://localhost:5173/agendar/${tenant.subdomain}\n`);
      }

    } else {
      console.log("❌ ERRO! Algumas colunas estão faltando.");
      console.log("   Verifique se a migration foi aplicada corretamente.\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  } catch (error) {
    console.error("❌ Erro no teste:", error);
    process.exit(1);
  }
}

testContactFields();
