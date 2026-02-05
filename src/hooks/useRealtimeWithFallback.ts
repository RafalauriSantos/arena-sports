import { useRef, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface RealtimeConfig {
    channelName: string;
    enabled?: boolean;
    maxRetries?: number;
    onSubscribed?: () => void;
    onError?: (error: unknown) => void;
    onClosed?: () => void;
}

/**
 * Hook para gerenciar conexões Realtime com fallback gracioso.
 * Desabilita automaticamente após muitas falhas para evitar loops infinitos.
 */
export function useRealtimeWithFallback(config: RealtimeConfig) {
    const { channelName, enabled = true, maxRetries = 3, onSubscribed, onError, onClosed } = config;

    const channelRef = useRef<RealtimeChannel | null>(null);
    const errorCountRef = useRef(0);
    const isDisabledRef = useRef(false);

    const cleanup = () => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }
    };

    useEffect(() => {
        if (!enabled || isDisabledRef.current) return;

        const handleStatus = (status: string, err?: unknown) => {
            if (status === 'SUBSCRIBED') {
                errorCountRef.current = 0; // Reset error count on success
                onSubscribed?.();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                errorCountRef.current++;

                if (errorCountRef.current >= maxRetries) {
                    console.warn(
                        `⚠️ [REALTIME] Desabilitando canal ${channelName} após ${errorCountRef.current} falhas. A aplicação continuará funcionando sem atualizações em tempo real.`
                    );
                    isDisabledRef.current = true;
                    cleanup();
                } else {
                    console.warn(
                        `⚠️ [REALTIME] Tentativa ${errorCountRef.current}/${maxRetries} falhou para ${channelName}`
                    );
                }

                onError?.(err);
            } else if (status === 'CLOSED') {
                onClosed?.();
            }
        };

        return cleanup;
    }, [enabled, channelName, maxRetries, onSubscribed, onError, onClosed]);

    return {
        channelRef,
        isDisabled: isDisabledRef.current,
        errorCount: errorCountRef.current,
        cleanup,
    };
}
