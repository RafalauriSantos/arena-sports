import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// --- Interfaces (Contratos de Dados) ---

export interface BookingSettings {
  require_deposit: boolean;      // Exigir sinal?
  deposit_type: 'percent' | 'fixed'; // Tipo (% ou R$)
  deposit_value: number;         // Valor (ex: 30 ou 20.00)
  enable_full_payment_discount: boolean; // Desconto à vista?
  full_payment_discount_percent: number; // % de desconto
}

export interface Court {
  id?: string;
  name: string;
  base_price: number;
  active: boolean;
}

interface PromoSettings {
  active: boolean;
  discount_percentage: number;
  promo_days: string[];
}

interface TenantData {
  business_name: string;
  phone: string;
  email: string;
  address: string;
  description: string;
  subdomain: string;
  settings: Record<string, any>;
}

interface Subscription {
  plan_name: string;
  status: "trial" | "active" | "past_due" | "canceled";
  monthly_price: number;
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

  // Estado para rastrear exclusões (para apagar do banco ao salvar)
  const [deletedCourtIds, setDeletedCourtIds] = useState<string[]>([]);

  // Estado de Leitura (Assinatura)
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);

  // Estado das Regras Financeiras (Novo)
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
    require_deposit: false,
    deposit_type: 'percent',
    deposit_value: 30,
    enable_full_payment_discount: false,
    full_payment_discount_percent: 10,
  });

  // Estado do Formulário (Edição)
  const [formData, setFormData] = useState({
    tenant: {
      business_name: "",
      phone: "",
      email: "",
      address: "",
      description: "",
      subdomain: "",
      settings: {},
    } as TenantData,
    courts: [] as Court[],
    promo: {
      active: false,
      discount_percentage: 0,
      promo_days: ["monday", "tuesday", "wednesday"],
    } as PromoSettings,
  });

  // 1. CARREGAR DADOS (READ)
  useEffect(() => {
    if (!tenantId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [tenantRes, courtsRes, promoRes, subRes] = await Promise.all([
          supabase.from("tenants").select("*").eq("id", tenantId).single(),
          supabase.from("courts").select("*").eq("tenant_id", tenantId).order("created_at"),
          supabase.from("promotion_rules").select("*").eq("tenant_id", tenantId).maybeSingle(),
          supabase.from("tenant_subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle()
        ]);

        if (tenantRes.error) throw tenantRes.error;

        // --- AQUI ESTÁ A MÁGICA DO MULTI-TENANT ---
        // Lemos as configurações salvas no JSON 'settings' do banco
        if (tenantRes.data.settings?.booking) {
          setBookingSettings(prev => ({ ...prev, ...tenantRes.data.settings.booking }));
        }

        // Atualiza Subscription
        if (subRes.data) setSubscription(subRes.data);

        // Atualiza Form Data
        setFormData({
          tenant: {
            business_name: tenantRes.data.business_name || "",
            phone: tenantRes.data.phone || "",
            email: tenantRes.data.email || "",
            address: tenantRes.data.address || "",
            description: tenantRes.data.description || "",
            subdomain: tenantRes.data.subdomain || "",
            settings: tenantRes.data.settings || {},
          },
          courts: courtsRes.data ? courtsRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            base_price: Number(c.base_price),
            active: c.active
          })) : [],
          promo: {
            active: promoRes.data?.active ?? false,
            discount_percentage: Number(promoRes.data?.discount_percentage ?? 20),
            promo_days: Array.isArray(promoRes.data?.promo_days)
              ? promoRes.data.promo_days
              : ["monday", "tuesday", "wednesday"],
          },
        });

      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível carregar seus dados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenantId, toast]);

  // 2. SALVAR DADOS (WRITE)
  const saveSettings = async () => {
    if (!tenantId) return;
    setSaving(true);

    try {
      // Prepara o JSON atualizado com as novas regras financeiras
      const currentSettings = formData.tenant.settings || {};
      const updatedSettingsJSON = {
        ...currentSettings,
        booking: bookingSettings // Salva as regras aqui dentro
      };

      // A. Tenant Update
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          business_name: formData.tenant.business_name,
          phone: formData.tenant.phone,
          email: formData.tenant.email,
          address: formData.tenant.address,
          description: formData.tenant.description,
          settings: updatedSettingsJSON, // <--- SALVA O JSON COM AS REGRAS FINANCEIRAS
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // B. Quadras Update/Insert (Parallel Promise)
      const courtPromises = formData.courts.map(court => {
        const payload = {
          tenant_id: tenantId,
          name: court.name,
          base_price: Number(court.base_price),
          active: true,
          id: court.id // Se tiver ID, o Supabase entende que é Update
        };
        return supabase.from("courts").upsert(payload);
      });

      await Promise.all(courtPromises);

      // C. Quadras Delete
      if (deletedCourtIds.length > 0) {
        await supabase.from("courts").delete().in("id", deletedCourtIds);
        setDeletedCourtIds([]); // Limpa a lista após deletar
      }

      // D. Promo Update (Upsert)
      await supabase.from("promotion_rules").upsert({
        tenant_id: tenantId,
        saas_category: "arena", // Padrão
        active: formData.promo.active,
        discount_percentage: Number(formData.promo.discount_percentage),
        promo_days: formData.promo.promo_days,
        trigger_day_of_week: 4 // Quinta-feira padrão
      }, { onConflict: "tenant_id" });

      toast({
        title: "Sucesso!",
        description: "Configurações salvas.",
        className: "bg-green-600 text-white border-none",
      });

    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Helpers de Estado ---

  const updateBookingSettings = (field: keyof BookingSettings, value: any) => {
    setBookingSettings(prev => ({ ...prev, [field]: value }));
  };

  const updateTenant = (field: keyof TenantData, value: string) => {
    setFormData(prev => ({
      ...prev,
      tenant: { ...prev.tenant, [field]: value }
    }));
  };

  const updatePromo = (field: keyof PromoSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      promo: { ...prev.promo, [field]: value }
    }));
  };

  const updateCourt = (index: number, field: keyof Court, value: any) => {
    const newCourts = [...formData.courts];
    // @ts-ignore
    newCourts[index] = { ...newCourts[index], [field]: value };
    setFormData(prev => ({ ...prev, courts: newCourts }));
  };

  const removeCourt = (index: number) => {
    const courtToRemove = formData.courts[index];
    if (courtToRemove.id) {
      setDeletedCourtIds(prev => [...prev, courtToRemove.id!]);
    }
    const newCourts = formData.courts.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, courts: newCourts }));
  };

  const addCourt = () => {
    setFormData(prev => ({
      ...prev,
      courts: [...prev.courts, { name: "Nova Quadra", base_price: 150, active: true }],
    }));
  };

  return {
    loading,
    saving,
    formData,
    subscription,
    isTrial: subscription.status === "trial",
    updateTenant,
    updatePromo,
    updateCourt,
    removeCourt,
    addCourt,
    saveSettings,
    bookingSettings, // Exportado corretamente
    updateBookingSettings, // Exportado corretamente
  };
}