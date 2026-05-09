/**
 * Hook para monitorar status do trial em tempo real
 * Atualiza a cada minuto e normaliza o trial padrão de 7 dias
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  totalDays: number;
  variant: "test_7d" | "legacy";
  canExtend: boolean;
  extensionDaysUsed: number;
  trialEndsAt: string;
  progress: number; // 0-100%
}

export function useTrialStatus(tenantId: string): TrialStatus | null {
  const [status, setStatus] = useState<TrialStatus | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from("tenant_subscriptions")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "trial")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // ✅ CORRIGIDO: maybeSingle não dá erro se vazio

      if (error || !data) {
        setStatus(null);
        return;
      }

      const now = new Date();
      const trialEnds = new Date(data.trial_ends_at);
      const trialStarts = new Date(data.trial_started_at);
      
      const timeRemaining = trialEnds.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.ceil(timeRemaining / (1000 * 60 * 60));
      const minutesRemaining = Math.ceil(timeRemaining / (1000 * 60));
      
      const totalTime = trialEnds.getTime() - trialStarts.getTime();
      const elapsedTime = now.getTime() - trialStarts.getTime();
      const progress = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
      
      const totalDays = Math.ceil(
        (trialEnds.getTime() - trialStarts.getTime()) / (1000 * 60 * 60 * 24)
      );

      setStatus({
        isActive: timeRemaining > 0,
        daysRemaining: Math.max(0, daysRemaining),
        hoursRemaining: Math.max(0, hoursRemaining),
        minutesRemaining: Math.max(0, minutesRemaining),
        totalDays,
        variant: data.trial_variant === "test_7d" ? "test_7d" : "legacy",
        canExtend: (data.trial_extension_days || 0) < 7,
        extensionDaysUsed: data.trial_extension_days || 0,
        trialEndsAt: data.trial_ends_at,
        progress: Math.round(progress),
      });
    };

    fetchStatus();

    // Atualiza a cada minuto
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [tenantId]);

  return status;
}
