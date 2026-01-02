export type PhoneDigits = string;

const digitsOnly = (raw: string) => (raw || "").replace(/\D/g, "");

/**
 * Normaliza telefone do cliente (armazenamento interno): DDD + número.
 * Aceita 10 (fixo) ou 11 (celular) dígitos. Se vier com prefixo 55, remove.
 */
export const normalizeCustomerPhone = (raw: string): PhoneDigits => {
    const digits = digitsOnly(raw);
    if (!digits) return "";
    if (digits.startsWith("55") && digits.length > 11) return digits.slice(2);
    return digits;
};

export const isValidCustomerPhone = (digits: PhoneDigits): boolean => {
    if (!digits) return true; // opcional
    return digits.length === 10 || digits.length === 11;
};

/**
 * Normaliza WhatsApp do tenant para uso em wa.me: inclui código do país (55).
 * Aceita:
 * - 10/11 dígitos (DDD+número) -> prefixa 55
 * - 12/13 dígitos começando com 55 -> mantém
 */
export const normalizeTenantWhatsApp = (raw: string): PhoneDigits => {
    const digits = digitsOnly(raw);
    if (!digits) return "";

    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
        return digits;
    }

    if (digits.length === 10 || digits.length === 11) {
        return `55${digits}`;
    }

    return digits;
};

export const isValidTenantWhatsApp = (digits: PhoneDigits): boolean => {
    if (!digits) return true; // opcional
    if (digits.startsWith("55")) return digits.length === 12 || digits.length === 13;
    return digits.length === 10 || digits.length === 11;
};

export const toWhatsAppLinkPhone = (raw: string): PhoneDigits => {
    const normalized = normalizeTenantWhatsApp(raw);
    // Caso venha inválido, ainda devolve apenas dígitos para não quebrar a UI.
    return digitsOnly(normalized);
};
