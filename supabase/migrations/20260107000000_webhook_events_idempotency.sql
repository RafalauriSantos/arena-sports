-- Criar tabela para idempotência de webhooks
-- Garante que eventos duplicados não sejam processados múltiplas vezes

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE, -- ID do evento Asaas para idempotência
    event_type TEXT NOT NULL, -- Tipo do evento (PAYMENT_CREATED, etc.)
    payload JSONB NOT NULL, -- Payload completo do webhook
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por event_id
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Índice para busca por tipo de evento
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);

-- Índice para limpeza de eventos antigos (retenção de 30 dias)
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);

-- RLS (Row Level Security)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Política para permitir apenas service role acessar (webhooks são internos)
CREATE POLICY "webhook_events_service_role_only" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Função para limpeza automática de eventos antigos (opcional)
-- Pode ser executada por um cron job
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_events
    WHERE created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;