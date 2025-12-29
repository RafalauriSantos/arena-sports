"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Database } from "@/components/admin/database.types";

type TimeSlotWithCourt = Database["public"]["Tables"]["arena_time_slots"]["Row"] & {
  courts: Pick<Database["public"]["Tables"]["courts"]["Row"], "name"> | null;
};

export interface CourtOccupancy {
  courtId: string;
  courtName: string;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
}

export function useDashboardMetrics(tenantId?: string) {
  const [revenueToday, setRevenueToday] = useState<number>(0);
  const [scheduledGames, setScheduledGames] = useState<number>(0);
  const [pendingRevenue, setPendingRevenue] = useState<number>(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ date: string; amount: number }[]>([]);
  const [occupancy, setOccupancy] = useState<CourtOccupancy[]>([]);
  const [agendaSlots, setAgendaSlots] = useState<TimeSlotWithCourt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!tenantId) return;

    const now = new Date();
    // Ajuste para garantir datas locais corretas (YYYY-MM-DD)
    const offset = now.getTimezoneOffset() * 60000;
    const localDate = new Date(now.getTime() - offset);
    const todayDateStr = localDate.toISOString().split("T")[0];

    // Intervalo para timestamptz (UTC)
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(now.setHours(23, 59, 59, 999)).toISOString();
    
    // Data de 7 dias atrás para o gráfico
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startOfSevenDays = sevenDaysAgo.toISOString();

    try {
      // 1. Métricas de Reservas (Hoje)
      const { data: reservations, error: resError } = await supabase
        .from("arena_reservations")
        .select("total_price, payment_status, start_time")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay);

      if (!resError && reservations) {
        // Faturamento Hoje (payment_status != 'failed')
        const total = reservations
          .filter(r => r.payment_status !== 'failed')
          .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
        setRevenueToday(total);

        // Jogos Agendados (Count)
        setScheduledGames(reservations.length);

        // A Receber (payment_status == 'pending')
        const pending = reservations
          .filter(r => r.payment_status === 'pending')
          .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
        setPendingRevenue(pending);
      }

      // 2. Receita dos Últimos 7 Dias (Gráfico)
      const { data: weeklyData } = await supabase
        .from("arena_reservations")
        .select("total_price, start_time")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfSevenDays)
        .neq("payment_status", "failed");

      if (weeklyData) {
        const grouped = weeklyData.reduce((acc: any, curr) => {
          const date = curr.start_time.split('T')[0]; // YYYY-MM-DD
          acc[date] = (acc[date] || 0) + (Number(curr.total_price) || 0);
          return acc;
        }, {});
        
        const chartData = Object.keys(grouped).map(date => ({ date, amount: grouped[date] }));
        setWeeklyRevenue(chartData);
      }

      // 3. Agenda Visual e Ocupação (Baseado em Slots)
      const { data: slots, error: slotsError } = await supabase
        .from("arena_time_slots")
        .select("*, courts(name)")
        .eq("tenant_id", tenantId)
        .eq("date", todayDateStr)
        .order("time");

      if (!slotsError && slots) {
        const typedSlots = slots as TimeSlotWithCourt[];
        setAgendaSlots(typedSlots);

        // Cálculo de Ocupação por Quadra
        const courtMap = new Map<string, { name: string; total: number; occupied: number }>();

        typedSlots.forEach((slot) => {
          const courtId = slot.court_id || "unknown";
          const courtName = slot.courts?.name || "Quadra";

          if (!courtMap.has(courtId)) {
            courtMap.set(courtId, { name: courtName, total: 0, occupied: 0 });
          }

          const current = courtMap.get(courtId)!;
          current.total += 1;
          // Consideramos ocupado se estiver agendado ou reservado
          if (slot.status === "booked" || slot.status === "reserved") {
            current.occupied += 1;
          }
        });

        const occupancyData: CourtOccupancy[] = Array.from(courtMap.entries()).map(([id, data]) => ({
          courtId: id,
          courtName: data.name,
          totalSlots: data.total,
          occupiedSlots: data.occupied,
          occupancyRate: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
        }));

        setOccupancy(occupancyData);
      }
    } catch (error) {
      console.error("Erro ao buscar métricas:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchMetrics();

    if (!tenantId) return;

    // Real-time: Escutar novas reservas para atualizar faturamento instantaneamente
    const channel = supabase
      .channel("dashboard-metrics-channel")
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "arena_reservations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Recarrega métricas quando houver mudança nas reservas
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchMetrics]);

  return {
    revenueToday,
    scheduledGames,
    pendingRevenue,
    weeklyRevenue,
    occupancy,
    agendaSlots,
    loading,
    refresh: fetchMetrics,
  };
}