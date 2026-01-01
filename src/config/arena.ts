// Arena Sports configuration - Easy to change
export const ARENA_SPORTS_CONFIG = {
  pixKey: "pix@arenasports.com",
  name: "Arena Sports",
  subtitle: "Gestão Inteligente de Quadras Esportivas",
  whatsapp: "5511999999999", // WhatsApp do dono (com código do país)
  fields: [
    {
      id: "principal",
      name: "Campo Principal",
      players: 12,
      priceOnline: 150,
      priceLocal: 160,
    },
    {
      id: "medio",
      name: "Campo Médio",
      players: 10,
      priceOnline: 130,
      priceLocal: 140,
    },
  ],
} as const;

export type FieldId = typeof ARENA_SPORTS_CONFIG.fields[number]["id"];
