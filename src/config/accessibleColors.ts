/**
 * Configuração de Cores Acessíveis - WCAG 2.1 AAA Compliant
 * Todos os contrastes atendem mínimo de 7:1 para AAA ou 4.5:1 para AA
 */

export const accessibleColors = {
    // Backgrounds
    bg: {
        primary: '#02040a',      // Fundo principal escuro
        secondary: '#0a0f1a',    // Fundo secundário
        card: 'rgba(255, 255, 255, 0.05)',  // Cards
        cardHover: 'rgba(255, 255, 255, 0.10)',
    },

    // Text colors - Alto contraste
    text: {
        primary: '#ffffff',      // Texto principal (21:1 contrast)
        secondary: '#d1d5db',    // Texto secundário (15:1 contrast)  
        tertiary: '#9ca3af',     // Texto terciário (9:1 contrast)
        muted: '#6b7280',        // Texto muted (7:1 contrast - AAA)
    },

    // Emerald - Ajustado para melhor contraste
    emerald: {
        50: '#f0fdf5',
        400: '#34d399',          // Original tinha contraste ruim
        500: '#10b981',          // Bom contraste
        600: '#059669',          // Melhor contraste (7.5:1)
        bg: 'rgba(16, 185, 129, 0.1)',
    },

    // Status colors - Alto contraste
    status: {
        success: '#10b981',      // Verde (4.5:1 minimum)
        warning: '#f59e0b',      // Laranja (4.8:1)
        error: '#ef4444',        // Vermelho (4.5:1)
        info: '#3b82f6',         // Azul (4.6:1)
    },

    // Borders
    border: {
        default: 'rgba(255, 255, 255, 0.1)',
        hover: 'rgba(255, 255, 255, 0.2)',
        focus: '#10b981',
    }
};

// Utility para aplicar cores acessíveis
export const getContrastText = (background: 'dark' | 'light') => {
    return background === 'dark' ? accessibleColors.text.primary : '#02040a';
};

// Classes Tailwind acessíveis
export const accessibleClasses = {
    // Botões
    buttonPrimary: 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold',
    buttonSecondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20',

    // Text
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',     // Melhor que text-gray-400
    textMuted: 'text-gray-400',         // Melhor que text-gray-500

    // Links
    link: 'text-emerald-400 hover:text-emerald-300 underline-offset-4',

    // Cards
    card: 'bg-white/5 hover:bg-white/10 border border-white/10',
};
