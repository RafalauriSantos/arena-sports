-- Migration: Limpar usuários de teste (manter apenas psgrando@gmail.com)
-- Data: 2026-01-23
-- IMPORTANTE: Mantém apenas o cliente de teste psgrando@gmail.com

-- Identificar tenant_id do cliente que deve ser mantido
DO $$
DECLARE
    v_keep_tenant_id uuid;
    v_keep_user_id uuid;
BEGIN
    -- Buscar user_id e tenant_id do cliente que deve ser mantido
    SELECT p.id, p.tenant_id INTO v_keep_user_id, v_keep_tenant_id
    FROM public.profiles p
    WHERE p.email = 'psgrando@gmail.com'
    LIMIT 1;

    IF v_keep_user_id IS NULL THEN
        RAISE NOTICE 'Cliente psgrando@gmail.com não encontrado. Nenhuma limpeza será feita.';
        RETURN;
    END IF;

    RAISE NOTICE 'Mantendo cliente: psgrando@gmail.com (User ID: %, Tenant ID: %)', v_keep_user_id, v_keep_tenant_id;

    -- 1. Apagar bookings de outros tenants
    DELETE FROM public.bookings
    WHERE tenant_id != v_keep_tenant_id;

    RAISE NOTICE 'Bookings de outros tenants apagados.';

    -- 2. Apagar recurring_slots de outros tenants
    DELETE FROM public.recurring_slots
    WHERE tenant_id != v_keep_tenant_id;

    RAISE NOTICE 'Recurring slots de outros tenants apagados.';

    -- 3. Apagar courts de outros tenants
    DELETE FROM public.courts
    WHERE tenant_id != v_keep_tenant_id;

    RAISE NOTICE 'Courts de outros tenants apagados.';

    -- 4. Apagar tenant_subscriptions de outros tenants
    DELETE FROM public.tenant_subscriptions
    WHERE tenant_id != v_keep_tenant_id;

    RAISE NOTICE 'Subscriptions de outros tenants apagadas.';

    -- 5. Primeiro, remover tenant_id dos profiles que serão apagados (para quebrar foreign key)
    UPDATE public.profiles
    SET tenant_id = NULL
    WHERE id != v_keep_user_id;

    RAISE NOTICE 'Tenant_id removido dos profiles que serão apagados.';

    -- 6. Apagar tenants (exceto o que deve ser mantido)
    DELETE FROM public.tenants
    WHERE id != v_keep_tenant_id;

    RAISE NOTICE 'Tenants de outros usuários apagados.';

    -- 7. Apagar profiles (exceto o que deve ser mantido)
    DELETE FROM public.profiles
    WHERE id != v_keep_user_id;

    RAISE NOTICE 'Profiles de outros usuários apagados.';

    -- 8. Apagar usuários do auth.users (exceto o que deve ser mantido)
    -- NOTA: Isso requer permissões especiais. Se falhar, pode ser feito manualmente no Supabase Dashboard
    BEGIN
        DELETE FROM auth.users
        WHERE id != v_keep_user_id;
        RAISE NOTICE 'Usuários do auth.users apagados (exceto psgrando@gmail.com).';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível apagar usuários do auth.users automaticamente.';
        RAISE NOTICE 'Execute manualmente no Supabase Dashboard > Authentication > Users';
        RAISE NOTICE 'Mantenha apenas o usuário com email: psgrando@gmail.com';
    END;

    RAISE NOTICE 'Limpeza concluída! Cliente psgrando@gmail.com foi mantido.';

END $$;

-- Verificar resultado
SELECT 
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE email = 'psgrando@gmail.com') as kept_profile
FROM public.profiles;

SELECT 
    COUNT(*) as total_tenants
FROM public.tenants;
