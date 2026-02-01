#!/usr/bin/env bun

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

interface Subscription {
  tenant_id: string;
  is_founder: boolean;
  status: string;
  plan_name: string;
  monthly_price: number;
}

interface Tenant {
  id: string;
  business_name: string;
  created_at: string;
  owner_id: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
}

interface CombinedData extends Subscription {
  tenants?: Tenant;
  profiles?: Profile;
}

async function checkFoundersStatus() {
  console.log('\n🔍 VERIFICANDO STATUS DOS FOUNDERS...\n');
  console.log('='.repeat(70));

  try {
    // Buscar todas as subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('tenant_subscriptions')
      .select('tenant_id, is_founder, status, plan_name, monthly_price')
      .in('status', ['active', 'trial', 'past_due']);

    if (subError) {
      console.error('❌ Erro ao consultar subscriptions:', subError.message);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('Nenhuma subscription encontrada.');
      return;
    }

    // Buscar tenants e profiles separadamente
    const tenantIds = subscriptions.map((s: Subscription) => s.tenant_id);
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, business_name, created_at, owner_id')
      .in('id', tenantIds);

    const ownerIds = tenants?.map((t: Tenant) => t.owner_id).filter(Boolean) || [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, tenant_id')
      .in('id', ownerIds);

    // Combinar os dados
    const data: CombinedData[] = subscriptions.map((sub: Subscription) => {
      const tenant = tenants?.find((t: Tenant) => t.id === sub.tenant_id);
      const profile = profiles?.find((p: Profile) => p.id === tenant?.owner_id);
      return {
        ...sub,
        tenants: tenant,
        profiles: profile,
      };
    }).sort((a: CombinedData, b: CombinedData) => {
      const dateA = a.tenants?.created_at ? new Date(a.tenants.created_at).getTime() : 0;
      const dateB = b.tenants?.created_at ? new Date(b.tenants.created_at).getTime() : 0;
      return dateA - dateB;
    });

    // Dados já processados acima

    console.log(`\n✅ Total de subscriptions encontradas: ${data.length}\n`);

    const founders = data.filter((sub: CombinedData) => sub.is_founder === true);
    const nonFounders = data.filter((sub: CombinedData) => sub.is_founder !== true);

    console.log(`\n🏆 FOUNDERS (${founders.length}):\n`);
    founders.forEach((sub: CombinedData, index: number) => {
      const tenant = sub.tenants;
      const profile = sub.profiles;
      console.log(`${index + 1}. ${profile?.email || 'N/A'}`);
      console.log(`   Nome: ${profile?.full_name || tenant?.business_name || 'N/A'}`);
      console.log(`   Tenant ID: ${sub.tenant_id}`);
      console.log(`   Criado em: ${tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : 'N/A'}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Preço: R$ ${(sub.monthly_price || 0) / 100}`);
      console.log('');
    });

    console.log(`\n👥 NÃO-FOUNDERS (${nonFounders.length}):\n`);
    nonFounders.forEach((sub: CombinedData, index: number) => {
      const tenant = sub.tenants;
      const profile = sub.profiles;
      console.log(`${index + 1}. ${profile?.email || 'N/A'}`);
      console.log(`   Nome: ${profile?.full_name || tenant?.business_name || 'N/A'}`);
      console.log(`   Tenant ID: ${sub.tenant_id}`);
      console.log(`   Criado em: ${tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString('pt-BR') : 'N/A'}`);
      console.log(`   Status: ${sub.status}`);
      console.log('');
    });

    console.log('='.repeat(70));
    console.log(`\n📊 RESUMO:`);
    console.log(`   Founders: ${founders.length}/20`);
    console.log(`   Não-Founders: ${nonFounders.length}`);
    console.log(`   Vagas restantes: ${Math.max(0, 20 - founders.length)}\n`);

  } catch (err) {
    console.error('❌ Erro:', err);
  }
}

checkFoundersStatus();
