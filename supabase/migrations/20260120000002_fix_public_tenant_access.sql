-- Migration: Garantir acesso público (anon) à tabela tenants para leitura por subdomain
-- Data: 2026-01-20
-- Descrição: Adiciona grant explícito para anon acessar tenants com subdomain (necessário para link público funcionar)

-- Garantir que anon pode ler tenants com subdomain
-- Isso é necessário para o link público /agendar/:subdomain funcionar
GRANT SELECT ON TABLE public.tenants TO anon;

-- A política RLS já existe e permite acesso apenas se subdomain IS NOT NULL
-- tenants_public_read_by_subdomain: for select to anon using (subdomain is not null);

-- Garantir que anon pode ler courts públicos também
GRANT SELECT ON TABLE public.courts TO anon;

-- Garantir que anon pode executar a função pública de horários ocupados
GRANT EXECUTE ON FUNCTION public.fn_public_get_occupied_slots(text, date) TO anon;

-- Comentário explicativo
COMMENT ON POLICY tenants_public_read_by_subdomain ON public.tenants IS 
'Permite acesso público (anon) para leitura de tenants que têm subdomain configurado. Necessário para o link público /agendar/:subdomain funcionar.';
