/**
 * Utilitário para busca de CEP via API ViaCEP
 */

export interface CepData {
  cep: string;
  logradouro: string; // Rua
  complemento: string;
  bairro: string;
  localidade: string; // Cidade
  uf: string; // Estado
  erro?: boolean;
}

/**
 * Formata CEP para exibição: 12345678 -> 12345-678
 */
export function formatCep(cep: string): string {
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length !== 8) return cep;
  return `${numbers.slice(0, 5)}-${numbers.slice(5)}`;
}

/**
 * Remove formatação do CEP: 12345-678 -> 12345678
 */
export function unformatCep(cep: string): string {
  return cep.replace(/\D/g, '');
}

/**
 * Valida se o CEP tem 8 dígitos
 */
export function isValidCep(cep: string): boolean {
  const numbers = cep.replace(/\D/g, '');
  return numbers.length === 8;
}

/**
 * Busca endereço pelo CEP usando a API ViaCEP
 */
export async function fetchAddressByCep(cep: string): Promise<CepData | null> {
  const cleanCep = unformatCep(cep);
  
  if (!isValidCep(cleanCep)) {
    throw new Error('CEP inválido. Digite 8 dígitos.');
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    
    if (!response.ok) {
      throw new Error('Erro ao buscar CEP. Tente novamente.');
    }

    const data: CepData = await response.json();

    if (data.erro) {
      throw new Error('CEP não encontrado.');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erro ao buscar CEP. Verifique sua conexão.');
  }
}

/**
 * Formata endereço completo para exibição
 */
export function formatFullAddress(
  street?: string,
  number?: string,
  complement?: string,
  neighborhood?: string,
  city?: string,
  state?: string
): string {
  const parts: string[] = [];

  if (street) {
    let addressLine = street;
    if (number) addressLine += `, ${number}`;
    if (complement) addressLine += ` - ${complement}`;
    parts.push(addressLine);
  }

  if (neighborhood) parts.push(neighborhood);
  if (city) {
    parts.push(state ? `${city}/${state}` : city);
  }

  return parts.join(' - ');
}
