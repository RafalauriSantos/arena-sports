-- 🧹 LIMPEZA INTELIGENTE: Remove duplicatas ignorando espaços e maiúsculas
-- Cole isso no SQL Editor do Supabase Dashboard

-- 1️⃣ Ver quantas duplicatas existem (agrupadas por nome normalizado)
SELECT
    LOWER(TRIM(name)) as nome_normalizado,
    COUNT(*) as total_duplicatas,
    MAX(base_price) as preco_mais_recente,
    MAX(created_at) as data_mais_recente
FROM courts
WHERE
    active = true
GROUP BY
    LOWER(TRIM(name))
ORDER BY nome_normalizado;

-- 2️⃣ DELETAR duplicatas (mantém apenas a mais recente de cada grupo)
WITH
    ranked_courts AS (
        SELECT
            id,
            name,
            LOWER(TRIM(name)) as nome_normalizado,
            ROW_NUMBER() OVER (
                PARTITION BY
                    LOWER(TRIM(name))
                ORDER BY created_at DESC
            ) as row_num
        FROM courts
        WHERE
            active = true
    )
DELETE FROM courts
WHERE
    id IN (
        SELECT id
        FROM ranked_courts
        WHERE
            row_num > 1
    );

-- 3️⃣ Ver resultado final (deve mostrar apenas 4 quadras: 3 campos + 1 teste)
SELECT
    name,
    base_price,
    active,
    created_at
FROM courts
WHERE
    active = true
ORDER BY name;