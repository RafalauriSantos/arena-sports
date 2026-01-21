/**
 * Formatação de telefone brasileiro
 * Aceita: 11999887766 ou (11) 99988-7766
 * Retorna: (11) 99988-7766
 */

export function formatPhoneInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  const limited = numbers.slice(0, 11);
  
  // Formata conforme o tamanho
  if (limited.length <= 2) {
    return limited;
  }
  
  if (limited.length <= 6) {
    // (11) 9998
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  }
  
  if (limited.length <= 10) {
    // (11) 9998-8776 (telefone fixo)
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  }
  
  // (11) 99988-7766 (celular com 9 dígitos)
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

/**
 * Remove a formatação para enviar ao banco
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Valida se o telefone está completo
 */
export function isValidPhone(value: string): boolean {
  const numbers = value.replace(/\D/g, '');
  // Aceita 10 dígitos (fixo) ou 11 dígitos (celular)
  return numbers.length === 10 || numbers.length === 11;
}

/**
 * Retorna mensagem de erro amigável
 */
export function getPhoneErrorMessage(value: string): string | null {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) {
    return "Por favor, informe seu telefone";
  }
  
  if (numbers.length < 10) {
    return "Telefone incompleto. Digite DDD + número";
  }
  
  if (numbers.length === 10) {
    // Telefone fixo válido
    return null;
  }
  
  if (numbers.length === 11) {
    // Celular válido
    return null;
  }
  
  return "Telefone inválido";
}
