import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Tipos para garantir intellisense e robustez
interface Subscription {
  plan_name: string;
  status: "trial" | "active" | "past_due" | "canceled";
  monthly_price: number;
  current_period_end?: string;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  plan_name: "Trial Gratuito",
  status: "trial",
  monthly_price: 0,
};

export function useSettings() {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletedCourtIds, setDeletedCourtIds] = useState<string[]>([]);

  // Dados de leitura (Read-only ou base para o form)
  const [subscription, setSubscription] =
    useState<Subscription>(DEFAULT_SUBSCRIPTION);

  // Estado do formulário (Mutável)
  const [formData, setFormData] = useState({
    tenant: {
      business_name: "",
      phone: "",
      email: "",
      address: "",
      description: "",
      subdomain: "", // Adicionado para link público
      settings: {},
    },
    courts: [] as any[],
    promo: {
      active: false,
      discount_percentage: 0,
      promo_days: ["monday", "tuesday", "wednesday"],
    },
  });

  // 1. Carregar Dados (FETCH)
  useEffect(() => {
    if (!tenantId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // A. Busca Tenant
        const { data: tenant } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", tenantId)
          .single();

        // B. Busca Quadras
        const { data: courts } = await supabase
          .from("courts")
          .select("*")
          .eq("tenant_id", tenantId)
          .order("created_at");

        // C. Busca Promoção
        const { data: promo } = await supabase
          .from("promotion_rules")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        // D. Busca Assinatura (BLINDAGEM)
        const { data: sub } = await supabase
          .from("tenant_subscriptions")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        // Atualiza estados
        setSubscription(sub || DEFAULT_SUBSCRIPTION);

        setFormData({
          tenant: {
            business_name: tenant?.business_name || "",
            phone: tenant?.phone || "",
            email: tenant?.email || "",
            address: tenant?.address || "",
            description: tenant?.description || "",
            subdomain: tenant?.subdomain || "",
            settings: tenant?.settings || {},
          },
          courts: courts || [],
          promo: {
            active: promo?.active ?? false,
            discount_percentage: promo?.discount_percentage ?? 20,
            promo_days: Array.isArray(promo?.promo_days)
              ? promo.promo_days
              : ["monday", "tuesday"],
          },
        });
      } catch (error) {
        console.error("Erro crítico ao carregar configurações:", error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível carregar seus dados. Tente recarregar.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [tenantId, toast]);

  // 2. Salvar Dados (SAVE)
  const saveSettings = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      // A. Salvar Tenant
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          business_name: formData.tenant.business_name,
          phone: formData.tenant.phone,
          email: formData.tenant.email,
          address: formData.tenant.address,
          description: formData.tenant.description,
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // B. Salvar Quadras (Upsert)
      for (const court of formData.courts) {
        const payload: any = {
          tenant_id: tenantId,
          name: court.name,
          base_price: Number(court.base_price),
          active: true,
        };
        if (court.id) payload.id = court.id;
        await supabase.from("courts").upsert(payload);
      }

      // C. Excluir Quadras removidas
      if (deletedCourtIds.length > 0) {
        await supabase.from("courts").delete().in("id", deletedCourtIds);
      }

      // C. Salvar Promoção
      await supabase
        .from("promotion_rules")
        .upsert(
          {
            tenant_id: tenantId,
            saas_category: "arena",
            active: formData.promo.active,
            discount_percentage: Number(formData.promo.discount_percentage),
            promo_days: formData.promo.promo_days,
          },
          { onConflict: "tenant_id" }
        );

      toast({
        title: "Alterações salvas",
        description: "Suas configurações foram atualizadas com sucesso.",
        className: "bg-primary text-black border-none",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Falha ao salvar",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helpers de atualização de estado
  const updateTenant = (field: string, value: any) =>
    setFormData((prev) => ({
      ...prev,
      tenant: { ...prev.tenant, [field]: value },
    }));

  const updatePromo = (field: string, value: any) =>
    setFormData((prev) => ({
      ...prev,
      promo: { ...prev.promo, [field]: value },
    }));

  const updateCourt = (index: number, field: string, value: any) => {
    const newCourts = [...formData.courts];
    newCourts[index] = { ...newCourts[index], [field]: value };
    setFormData((prev) => ({ ...prev, courts: newCourts }));
  };

  const removeCourt = (index: number) => {
    const courtToRemove = formData.courts[index];
    if (courtToRemove.id) {
      setDeletedCourtIds((prev) => [...prev, courtToRemove.id]);
    }
    const newCourts = formData.courts.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, courts: newCourts }));
  };

  const addCourt = () => {
    setFormData((prev) => ({
      ...prev,
      courts: [...prev.courts, { name: "Nova Quadra", base_price: 150 }],
    }));
  };

  // Exposição da API do Hook
  return {
    loading,
    saving,
    formData,
    subscription, // Exposto separadamente
    isTrial: subscription.status === "trial",
    updateTenant,
    updatePromo,
    updateCourt,
    removeCourt,
    addCourt,
    saveSettings,
  };
}
