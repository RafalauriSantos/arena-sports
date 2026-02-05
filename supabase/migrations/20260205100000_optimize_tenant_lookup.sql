-- Função otimizada para buscar tenant por subdomain (case-insensitive)
-- Substitui as 3-4 queries sequenciais por 1 única chamada

CREATE OR REPLACE FUNCTION fn_public_get_tenant_by_subdomain(p_subdomain text)
RETURNS TABLE (
    id uuid,
    business_name text,
    phone text,
    email text,
    address text,
    description text,
    cep text,
    street text,
    number text,
    complement text,
    neighborhood text,
    city text,
    state text,
    settings jsonb,
    subdomain text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.business_name,
        t.phone,
        t.email,
        t.address,
        t.description,
        t.cep,
        t.street,
        t.number,
        t.complement,
        t.neighborhood,
        t.city,
        t.state,
        t.settings,
        t.subdomain
    FROM tenants t
    WHERE LOWER(TRIM(t.subdomain)) = LOWER(TRIM(p_subdomain))
    LIMIT 1;
END;
$$;

-- Permitir acesso público
GRANT EXECUTE ON FUNCTION fn_public_get_tenant_by_subdomain(text) TO anon, authenticated;

COMMENT ON FUNCTION fn_public_get_tenant_by_subdomain IS 
'Busca tenant por subdomain (case-insensitive e trimmed). Retorna apenas dados públicos.';
