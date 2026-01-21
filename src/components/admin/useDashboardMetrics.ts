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
  paid_amount: number | null;
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

  // Função para obter o início da semana (segunda-feira)
  const getStartOfWeek = useCallback((date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajusta para segunda-feira
    return new Date(d.setDate(diff));
  }, []);

  // Função para obter o fim da semana (domingo)
  const getEndOfWeek = useCallback((date: Date): Date => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Adiciona 6 dias para chegar no domingo
    end.setHours(23, 59, 59, 999);
    return end;
  }, [getStartOfWeek]);

  const fetchMetrics = useCallback(async () => {
    if (!tenantId) return;

    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

    // Intervalo do dia atual em UTC (com base na meia-noite local)
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

    // Semana completa: segunda a domingo da semana atual
    const startOfWeek = getStartOfWeek(now);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = getEndOfWeek(now);
    const startOfWeekISO = startOfWeek.toISOString();
    const endOfWeekISO = endOfWeek.toISOString();

    try {
      // 0) Courts (base para ocupação e agenda)
      const { data: courtsData, error: courtsError } = await supabase
        .from("courts")
        .select("id, name, tenant_id, active")
        .eq("tenant_id", tenantId)
        .eq("active", true);
      if (courtsError) throw courtsError;

      // 1) Métricas de Reservas (Hoje)
      // Inclui todos os jogos do dia: pending, paid, in_progress, completed
      const { data: bookingsToday, error: bookingsTodayError } = await supabase
        .from("bookings")
        .select("total_price, paid_amount, status, start_time, court_id")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfDay)
        .lte("start_time", endOfDay)
        .neq("status", "cancelled"); // Exclui cancelados
      if (bookingsTodayError) throw bookingsTodayError;

      const today = (bookingsToday as BookingRow[] | null) ?? [];
      
      // Receita de hoje: usa paid_amount se disponível, senão total_price se status = paid
      const totalPaidToday = today.reduce((acc, curr) => {
        // Se tem paid_amount, usa ele (já foi pago parcial ou total)
        if (curr.paid_amount != null && curr.paid_amount > 0) {
          return acc + Number(curr.paid_amount);
        }
        // Se status é paid mas não tem paid_amount, usa total_price
        if (curr.status === "paid") {
          return acc + (Number(curr.total_price) || 0);
        }
        // Se status é in_progress ou completed, considera como pago (já aconteceu)
        if (curr.status === "in_progress" || curr.status === "completed") {
          return acc + (Number(curr.total_price) || 0);
        }
        return acc;
      }, 0);
      
      setRevenueToday(totalPaidToday);
      
      // Jogos de hoje: todos exceto cancelados
      setScheduledGames(today.length);

      // Receita pendente: apenas pending sem pagamento
      const pending = today
        .filter((b) => b.status === "pending" || b.status === "pending_payment")
        .filter((b) => !b.paid_amount || b.paid_amount === 0)
        .reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
      setPendingRevenue(pending);

      // 2) Receita da Semana Completa (Segunda a Domingo) - Gráfico
      const { data: weeklyData, error: weeklyError } = await supabase
        .from("bookings")
        .select("total_price, paid_amount, start_time, status")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfWeekISO)
        .lte("start_time", endOfWeekISO)
        .neq("status", "cancelled"); // Exclui cancelados
      if (weeklyError) throw weeklyError;

      const week = (weeklyData as BookingRow[] | null) ?? [];
      
      // Agrupa por dia da semana
      const grouped = week.reduce((acc: Record<string, number>, curr) => {
        const date = toLocalDateStr(curr.start_time);
        
        // Calcula o valor pago: usa paid_amount se disponível, senão total_price se pago
        let amount = 0;
        if (curr.paid_amount != null && curr.paid_amount > 0) {
          amount = Number(curr.paid_amount);
        } else if (curr.status === "paid" || curr.status === "in_progress" || curr.status === "completed") {
          amount = Number(curr.total_price) || 0;
        }
        
        acc[date] = (acc[date] || 0) + amount;
        return acc;
      }, {});
      
      // Preenche todos os dias da semana (segunda a domingo) mesmo sem dados
      const weekDays: { date: string; amount: number }[] = [];
      const currentDate = new Date(startOfWeek);
      for (let i = 0; i < 7; i++) {
        const dateStr = `${currentDate.getFullYear()}-${pad2(currentDate.getMonth() + 1)}-${pad2(currentDate.getDate())}`;
        weekDays.push({
          date: dateStr,
          amount: grouped[dateStr] || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setWeeklyRevenue(weekDays);

      // 3) Agenda Visual e Ocupação (gerada a partir de courts + bookings)
      // Busca todos os bookings da semana para calcular ocupação
      const { data: weekBookings, error: weekBookingsError } = await supabase
        .from("bookings")
        .select("court_id, start_time, status")
        .eq("tenant_id", tenantId)
        .gte("start_time", startOfWeekISO)
        .lte("start_time", endOfWeekISO)
        .neq("status", "cancelled");
      if (weekBookingsError) throw weekBookingsError;
      
      const courts = ((courtsData as CourtRow[] | null) ?? []).filter((c) => c.active);
      
      // Lookup de horários reservados de hoje
      const bookedLookup = new Set(
        today
          .filter((b) => !!b.court_id)
          .map((b) => `${b.court_id}-${toLocalTimeStr(b.start_time)}`)
      );
      
      // Lookup de horários reservados da semana (para ocupação)
      const weekBookedLookup = new Set(
        (weekBookings as Array<{ court_id: string | null; start_time: string }> | null) ?? []
          .filter((b) => !!b.court_id)
          .map((b) => `${b.court_id}-${toLocalDateStr(b.start_time)}-${toLocalTimeStr(b.start_time)}`)
      );

      const generatedAgenda: AgendaSlotWithCourt[] = [];
      const occupancyData: CourtOccupancy[] = [];

      // Agenda de hoje
      courts.forEach((court) => {
        for (let hour = OPENING_HOUR; hour <= CLOSING_HOUR; hour++) {
          const time = `${hour.toString().padStart(2, "0")}:00`;
          const isReserved = bookedLookup.has(`${court.id}-${time}`);

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
      });
      
      // Taxa de ocupação da semana (segunda a domingo)
      courts.forEach((court) => {
        let totalSlotsWeek = 0;
        let occupiedSlotsWeek = 0;

        // Calcula para cada dia da semana
        const currentDate = new Date(startOfWeek);
        for (let day = 0; day < 7; day++) {
          const dateStr = `${currentDate.getFullYear()}-${pad2(currentDate.getMonth() + 1)}-${pad2(currentDate.getDate())}`;
          
          for (let hour = OPENING_HOUR; hour <= CLOSING_HOUR; hour++) {
            const time = `${hour.toString().padStart(2, "0")}:00`;
            totalSlotsWeek += 1;
            
            const isReserved = weekBookedLookup.has(`${court.id}-${dateStr}-${time}`);
            if (isReserved) occupiedSlotsWeek += 1;
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }

        occupancyData.push({
          courtId: court.id,
          courtName: court.name,
          totalSlots: totalSlotsWeek,
          occupiedSlots: occupiedSlotsWeek,
          occupancyRate: totalSlotsWeek > 0 ? Math.round((occupiedSlotsWeek / totalSlotsWeek) * 100) : 0,
        });
      });

      setAgendaSlots(generatedAgenda);
      setOccupancy(occupancyData);
    } catch (error) {
      console.error("Erro ao buscar métricas:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, getStartOfWeek, getEndOfWeek]);

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