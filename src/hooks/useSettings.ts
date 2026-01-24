import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { normalizeTenantWhatsApp, isValidTenantWhatsApp } from "@/lib/phone";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
  if (!isRecord(value)) return undefined;
  const v = value[key];
  return typeof v === "string" ? v : undefined;
};

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
  half_hour_price?: number; // Preço da meia hora adicional (1h30)
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
  cpf_cnpj: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  settings: Record<string, unknown>;
}

interface Subscription {
  plan_name: string;
  status: "trial" | "active" | "past_due" | "canceled";
  monthly_price: number;
  plan_code?: string | null;
  billing_interval?: "month" | "year" | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  grace_ends_at?: string | null;
}

const DEFAULT_SUBSCRIPTION: Subscription = {
  plan_name: "Trial do Plano Pro (7 dias) — tudo liberado",
  status: "trial",
  monthly_price: 0,
};

export function useSettings() {
  const { tenantId, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para rastrear exclusões (para apagar do banco ao salvar)
  const [deletedCourtIds, setDeletedCourtIds] = useState<string[]>([]);

  // Estado de Leitura (Assinatura)
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUBSCRIPTION);

  const refetchSubscription = async () => {
    if (!tenantId) return;
    const { data, error } = await supabase
      .from("tenant_subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1);
    if (error) throw error;
    if (data?.[0]) setSubscription(data[0] as unknown as Subscription);
  };

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
      cpf_cnpj: "",
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
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
          supabase
            .from("courts")
            .select("*")
            .eq("tenant_id", tenantId)
            .eq("active", true)
            .order("created_at"),
          supabase.from("promotion_rules").select("*").eq("tenant_id", tenantId).maybeSingle(),
          supabase
            .from("tenant_subscriptions")
            .select("*")
            .eq("tenant_id", tenantId)
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false, nullsFirst: false })
            .limit(1)
        ]);

        if (tenantRes.error) throw tenantRes.error;
        if (subRes.error) throw subRes.error;

        // --- AQUI ESTÁ A MÁGICA DO MULTI-TENANT ---
        // Lemos as configurações salvas no JSON 'settings' do banco
        if (tenantRes.data.settings?.booking) {
          setBookingSettings(prev => ({ ...prev, ...tenantRes.data.settings.booking }));
        }

        // Atualiza Subscription
        if (Array.isArray(subRes.data) && subRes.data[0]) {
          setSubscription(subRes.data[0] as unknown as Subscription);
        }

        // Obter email do usuário autenticado
        const userEmail = user?.email || "";

        // Se o email do tenant estiver vazio, usar o email do usuário
        const tenantEmail = tenantRes.data.email || userEmail;
        const shouldAutoSave = !tenantRes.data.email && userEmail;

        // Atualiza Form Data
        const newFormData = {
          tenant: {
            business_name: tenantRes.data.business_name || "",
            phone: tenantRes.data.phone || "",
            email: tenantEmail,
            address: tenantRes.data.address || "",
            description: tenantRes.data.description || "",
            subdomain: tenantRes.data.subdomain || "",
            cpf_cnpj: tenantRes.data.cpf_cnpj || "", // Usar coluna correta cpf_cnpj
            cep: tenantRes.data.cep || "",
            street: tenantRes.data.street || "",
            number: tenantRes.data.number || "",
            complement: tenantRes.data.complement || "",
            neighborhood: tenantRes.data.neighborhood || "",
            city: tenantRes.data.city || "",
            state: tenantRes.data.state || "",
            settings: tenantRes.data.settings || {},
          },
          courts: Array.isArray(courtsRes.data)
            ? courtsRes.data
              .filter(isRecord)
              // Remove duplicatas: normaliza nome (trim + lowercase) antes de comparar
              .reduce((acc: Court[], c) => {
                const courtName = typeof c.name === "string" ? c.name : "";
                const normalizedName = courtName.trim().toLowerCase();
                const existing = acc.find(court =>
                  court.name.trim().toLowerCase() === normalizedName
                );
                if (!existing) {
                  acc.push({
                    id: typeof c.id === "string" ? c.id : undefined,
                    name: courtName.trim(), // Remove espaços extras
                    base_price: Number(c.base_price ?? 0),
                    half_hour_price: Number(c.half_hour_price ?? 0) || undefined,
                    active: typeof c.active === "boolean" ? c.active : true,
                  });
                }
                return acc;
              }, [])
            : [],
          promo: {
            active: promoRes.data?.active ?? false,
            discount_percentage: Number(promoRes.data?.discount_percentage ?? 20),
            promo_days: Array.isArray(promoRes.data?.promo_days)
              ? promoRes.data.promo_days
              : ["monday", "tuesday", "wednesday"],
          },
        };

        setFormData(newFormData);

        // Salvar automaticamente se o email foi preenchido
        if (shouldAutoSave && userEmail) {
          // Aguardar um pouco para garantir que o estado foi atualizado
          setTimeout(async () => {
            try {
              const { error: tenantError } = await supabase
                .from("tenants")
                .update({
                  email: userEmail,
                })
                .eq("id", tenantId);

              if (tenantError) {
                console.error("Erro ao salvar email automaticamente:", tenantError);
              } else {
                console.log("✅ Email preenchido e salvo automaticamente:", userEmail);
              }
            } catch (error) {
              console.error("Erro ao salvar email automaticamente:", error);
            }
          }, 500);
        }

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
  }, [tenantId, user, toast]);

  // 2. SALVAR DADOS (WRITE)
  const saveSettings = async () => {
    if (!tenantId) return;
    if (saving) {
      console.warn("⚠️ Salvamento já em andamento, ignorando clique duplicado");
      return; // Previne cliques duplos
    }
    setSaving(true);

    try {
      const normalizedWhatsApp = normalizeTenantWhatsApp(formData.tenant.phone || "");
      if (normalizedWhatsApp && !isValidTenantWhatsApp(normalizedWhatsApp)) {
        throw new Error("WhatsApp inválido. Use DDD + número (10/11 dígitos) ou 55 + DDD + número.");
      }

      // Validate CPF/CNPJ - converter string vazia para null
      const cpfCnpjRaw = formData.tenant.cpf_cnpj?.replace(/\D/g, "") || "";
      const cpfCnpjClean = cpfCnpjRaw.trim();

      // Se estiver vazio, usar null (requisito da constraint do banco)
      const cpfCnpjFinal = cpfCnpjClean === "" ? null : cpfCnpjClean;

      if (cpfCnpjFinal && cpfCnpjFinal.length !== 11 && cpfCnpjFinal.length !== 14) {
        throw new Error("CPF/CNPJ inválido. CPF deve ter 11 dígitos, CNPJ 14 dígitos.");
      }

      // Prepara o JSON atualizado com as novas regras financeiras
      const currentSettings = formData.tenant.settings || {};
      const updatedSettingsJSON = {
        ...currentSettings,
        booking: bookingSettings // Salva as regras aqui dentro
      };

      // Normalizar subdomain (mesma lógica usada na busca em BookingPublic.tsx)
      const normalizeSubdomain = (input: string) => {
        if (!input) return "";
        return input
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Tira acentos
          .replace(/[^a-z0-9]+/g, "-") // Troca símbolos por hífen
          .replace(/^-+|-+$/g, ""); // Tira hifens das pontas
      };

      const normalizedSubdomain = normalizeSubdomain(formData.tenant.subdomain);

      // A. Tenant Update
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({
          business_name: formData.tenant.business_name,
          subdomain: normalizedSubdomain,
          phone: normalizedWhatsApp,
          email: formData.tenant.email,
          description: formData.tenant.description,
          cpf_cnpj: cpfCnpjFinal, // Já convertido para null se vazio (requisito da constraint)
          cep: formData.tenant.cep?.replace(/\D/g, "") || null,
          street: formData.tenant.street || null,
          number: formData.tenant.number || null,
          complement: formData.tenant.complement || null,
          neighborhood: formData.tenant.neighborhood || null,
          city: formData.tenant.city || null,
          state: formData.tenant.state?.toUpperCase() || null,
          settings: updatedSettingsJSON, // <--- SALVA O JSON COM AS REGRAS FINANCEIRAS
        })
        .eq("id", tenantId);

      if (tenantError) throw tenantError;

      // B. Validação: detectar nomes duplicados (ignorando espaços e maiúsculas)
      const normalizedNames = formData.courts.map(c => c.name.trim().toLowerCase());
      const duplicates = normalizedNames.filter((name, idx) =>
        normalizedNames.indexOf(name) !== idx
      );

      if (duplicates.length > 0) {
        throw new Error(`Nomes de quadras duplicados detectados. Por favor, use nomes únicos.`);
      }

      // C. Quadras Update/Insert (Sequential para evitar duplicatas)
      for (const court of formData.courts) {
        const trimmedName = court.name.trim(); // Remove espaços extras

        if (court.id) {
          // UPDATE: Quadra existente
          const { error: updateError } = await supabase
            .from("courts")
            .update({
              name: trimmedName,
              base_price: Number(court.base_price),
              half_hour_price: Number(court.half_hour_price || 0),
              active: true,
            })
            .eq("id", court.id)
            .eq("tenant_id", tenantId); // Segurança extra

          if (updateError) throw updateError;
        } else {
          // INSERT: Nova quadra
          const { error: insertError } = await supabase
            .from("courts")
            .insert({
              tenant_id: tenantId,
              name: trimmedName,
              base_price: Number(court.base_price),
              half_hour_price: Number(court.half_hour_price || 0),
              active: true,
            });

          if (insertError) throw insertError;
        }
      }

      // C. Quadras Delete
      if (deletedCourtIds.length > 0) {
        // Soft delete: evita conflitos (409) quando existem reservas ligadas à quadra.
        const { error: disableError } = await supabase
          .from("courts")
          .update({ active: false })
          .in("id", deletedCourtIds);

        if (disableError) throw disableError;

        setDeletedCourtIds([]); // Limpa a lista após desativar
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

    } catch (error: unknown) {
      console.error(error);
      const message = getStringProp(error, "message") || "Erro ao salvar";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // --- Helpers de Estado ---

  const updateBookingSettings = <K extends keyof BookingSettings>(
    field: K,
    value: BookingSettings[K]
  ) => {
    setBookingSettings(prev => ({ ...prev, [field]: value }));
  };

  const updateTenant = (field: keyof TenantData, value: string) => {
    if (field === "phone") {
      // Mantém só dígitos e limita tamanho (55 + DDD + número)
      const digits = value.replace(/\D/g, "").slice(0, 13);
      setFormData(prev => ({
        ...prev,
        tenant: { ...prev.tenant, [field]: digits }
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      tenant: { ...prev.tenant, [field]: value }
    }));
  };

  const updatePromo = <K extends keyof PromoSettings>(
    field: K,
    value: PromoSettings[K]
  ) => {
    setFormData(prev => ({
      ...prev,
      promo: { ...prev.promo, [field]: value }
    }));
  };

  const updateCourt = <K extends keyof Court>(
    index: number,
    field: K,
    value: Court[K]
  ) => {
    const newCourts = [...formData.courts];
    newCourts[index] = { ...newCourts[index], [field]: value } as Court;
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
      courts: [...prev.courts, { name: "", base_price: 0, active: true }],
    }));
  };

  return {
    loading,
    saving,
    formData,
    subscription,
    isTrial: subscription.status === "trial",
    refetchSubscription,
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