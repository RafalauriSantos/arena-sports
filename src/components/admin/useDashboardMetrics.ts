import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

type CourtRow = {
  id: string;
  name: string;
  tenant_id: string;
  active: boolean;
};

type BookingRow = {
  total_price: number | null;
  status: string | null;
  start_time: string;
  court_id: string | null;
};

type AgendaSlotWithCourt = {
  id: string;
  tenant_id: string;
  date: string; // YYYY-MM-DD (local)
  time: string; // HH:mm (local)
  status: "available" | "reserved";
  court_id: string;
  courts: { name: string } | null;
};

export interface CourtOccupancy {
  courtId: string;
  courtName: string;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
}

const OPENING_HOUR = 7;
const CLOSING_HOUR = 23;

const pad2 = (value: number) => String(value).padStart(2, "0");

const toLocalDateStr = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const toLocalTimeStr = (iso: string) => {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export function useDashboardMetrics(tenantId?: string) {
  const [revenueToday, setRevenueToday] = useState<number>(0);
  const [scheduledGames, setScheduledGames] = useState<number>(0);
  const [pendingRevenue, setPendingRevenue] = useState<number>(0);
  const [weeklyRevenue, setWeeklyRevenue] = useState<{ date: string; amount: number }[]>([]);
  const [occupancy, setOccupancy] = useState<CourtOccupancy[]>([]);
  const [agendaSlots, setAgendaSlots] = useState<AgendaSlotWithCourt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!tenantId) return;

    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    // Intervalo do dia atual em UTC (com base na meia-noite local)
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

    // Data de 7 dias atrás para o gráfico
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startOfSevenDays = sevenDaysAgo.toISOString();

    try {
      // 0) Courts (base para ocupação e agenda)
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("id, name, tenant_id, active")
        .eq("tenant_id", tenantId)
        .eq("active", true);
      if (courtsError) throw courtsError;

      // 1) Métricas de Reservas (Hoje)
      const { data: bookingsToday, error: bookingsTodayError } = await supabase
        .from("bookings")
        .select("total_price, status, start_time, court_id")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay);
      if (bookingsTodayError) throw bookingsTodayError;

      const today = (bookingsToday as BookingRow[] | null) ?? [];
      const totalPaidToday = today
        .filter((b) => b.status === "paid")
        .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
      setRevenueToday(totalPaidToday);
      setScheduledGames(today.length);

      const pending = today
        .filter((b) => b.status === "pending")
        .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
      setPendingRevenue(pending);

      // 2) Receita dos Últimos 7 Dias (Gráfico)
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("bookings")
        .select("total_price, start_time, status")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfSevenDays)
        .eq("status", "paid");
      if (weeklyError) throw weeklyError;

      const week = (weeklyData as Array<Pick<BookingRow, "total_price" | "start_time">> | null) ?? [];
      const grouped = week.reduce((acc: Record<string, number>, curr) => {
        const date = toLocalDateStr(curr.start_time);
        acc[date] = (acc[date] || 0) + (Number(curr.total_price) || 0);
        return acc;
      }, {});
      const chartData = Object.keys(grouped)
        .sort()
        .map((date) => ({ date, amount: grouped[date] }));
      setWeeklyRevenue(chartData);

      // 3) Agenda Visual e Ocupação (gerada a partir de courts + bookings)
      const courts = ((courtsData as CourtRow[] | null) ?? []).filter((c) => c.active);
      const bookedLookup = new Set(
        today
          .filter((b) => !!b.court_id)
          .map((b) => `${b.court_id}-${toLocalTimeStr(b.start_time)}`)
      );

      const generatedAgenda: AgendaSlotWithCourt[] = [];
      const occupancyData: CourtOccupancy[] = [];

      courts.forEach((court) => {
        let total = 0;
        let occupied = 0;

        for (let hour = OPENING_HOUR; hour <= CLOSING_HOUR; hour++) {
          const time = `${hour.toString().padStart(2, "0")}:00`;
          total += 1;

          const isReserved = bookedLookup.has(`${court.id}-${time}`);
          if (isReserved) occupied += 1;

          generatedAgenda.push({
            id: `${court.id}-${todayDateStr}-${time}`,
            tenant_id: tenantId,
            date: todayDateStr,
            time,
            status: isReserved ? "reserved" : "available",
            court_id: court.id,
            courts: { name: court.name },
          });
        }

        occupancyData.push({
          courtId: court.id,
          courtName: court.name,
          totalSlots: total,
          occupiedSlots: occupied,
          occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
        });
      });

      setAgendaSlots(generatedAgenda);
      setOccupancy(occupancyData);
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
          table: "bookings",
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