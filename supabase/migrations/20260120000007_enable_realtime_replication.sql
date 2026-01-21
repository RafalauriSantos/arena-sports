-- ============================================================================
-- Migration: Habilitar Replication para Real-time
-- Data: 2026-01-20
-- Descrição: Habilita replication nas tabelas necessárias para real-time funcionar
-- ============================================================================

BEGIN;

-- 1. Habilita REPLICA IDENTITY FULL nas tabelas que precisam de real-time
-- Isso permite que o Supabase capture mudanças completas (INSERT, UPDATE, DELETE)

ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.courts REPLICA IDENTITY FULL;
ALTER TABLE public.tenants REPLICA IDENTITY FULL;

-- 2. Adiciona as tabelas à publicação supabase_realtime
-- Isso é necessário para que os eventos sejam propagados via WebSocket

DO $$
BEGIN
    -- Adiciona bookings à publicação (se ainda não estiver)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'bookings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
        RAISE NOTICE 'Tabela bookings adicionada à publicação supabase_realtime';
    ELSE
        RAISE NOTICE 'Tabela bookings já está na publicação supabase_realtime';
    END IF;

    -- Adiciona courts à publicação (se ainda não estiver)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'courts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.courts;
        RAISE NOTICE 'Tabela courts adicionada à publicação supabase_realtime';
    ELSE
        RAISE NOTICE 'Tabela courts já está na publicação supabase_realtime';
    END IF;

    -- Adiciona tenants à publicação (se ainda não estiver)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'tenants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tenants;
        RAISE NOTICE 'Tabela tenants adicionada à publicação supabase_realtime';
    ELSE
        RAISE NOTICE 'Tabela tenants já está na publicação supabase_realtime';
    END IF;
END $$;

-- 3. Comentários para documentação
COMMENT ON TABLE public.bookings IS 'Tabela de reservas - Real-time habilitado';
COMMENT ON TABLE public.courts IS 'Tabela de quadras - Real-time habilitado';
COMMENT ON TABLE public.tenants IS 'Tabela de tenants - Real-time habilitado';

COMMIT;
