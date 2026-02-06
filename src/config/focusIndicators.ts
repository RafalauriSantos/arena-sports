/**
 * WCAG AAA Focus Indicators
 * Indicadores de foco visíveis para navegação por teclado
 */

export const focusStyles = {
    // Focus ring padrão (3px outline, contraste 7:1)
    ring: "focus:outline-none focus:ring-4 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-gray-900",

    // Focus para botões primários (emerald)
    buttonPrimary: "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]",

    // Focus para botões secundários
    buttonSecondary: "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]",

    // Focus para links
    link: "focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4 focus-visible:decoration-2 focus-visible:decoration-emerald-400",

    // Focus para inputs
    input: "focus:outline-none focus:ring-4 focus:ring-emerald-500/50 focus:border-emerald-500",

    // Focus para cards interativos
    card: "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020205]",
};

/**
 * Classes Tailwind para aplicar nos componentes
 */
export const a11yFocusClasses = {
    buttonPrimary: `
		focus-visible:outline-none
		focus-visible:ring-4
		focus-visible:ring-emerald-400/70
		focus-visible:ring-offset-2
		focus-visible:ring-offset-[#020205]
		transition-all
		duration-200
	`,

    buttonSecondary: `
		focus-visible:outline-none
		focus-visible:ring-4
		focus-visible:ring-white/40
		focus-visible:ring-offset-2
		focus-visible:ring-offset-[#020205]
		transition-all
		duration-200
	`,

    link: `
		focus-visible:outline-none
		focus-visible:underline
		focus-visible:underline-offset-4
		focus-visible:decoration-2
		focus-visible:decoration-emerald-400
		transition-all
		duration-200
	`,

    input: `
		focus:outline-none
		focus:ring-4
		focus:ring-emerald-500/50
		focus:border-emerald-500
		transition-all
		duration-200
	`,
};
