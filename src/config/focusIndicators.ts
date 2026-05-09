/**
 * WCAG AAA Focus Indicators
 * Indicadores de foco visíveis para navegação por teclado
 */

export const focusStyles = {
    // Focus ring padrão (3px outline, contraste 7:1)
    ring: "focus:outline-none focus:ring-4 focus:ring-blue-500/60 focus:ring-offset-2 focus:ring-offset-blue-50",

    // Focus para botões primários
    buttonPrimary: "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-50",

    // Focus para botões secundários
    buttonSecondary: "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-50",

    // Focus para links
    link: "focus-visible:outline-none focus-visible:underline focus-visible:underline-offset-4 focus-visible:decoration-2 focus-visible:decoration-blue-500",

    // Focus para inputs
    input: "focus:outline-none focus:ring-4 focus:ring-blue-500/40 focus:border-blue-600",

    // Focus para cards interativos
    card: "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-50",
};

/**
 * Classes Tailwind para aplicar nos componentes
 */
export const a11yFocusClasses = {
    buttonPrimary: `
		focus-visible:outline-none
		focus-visible:ring-4
		focus-visible:ring-blue-500/60
		focus-visible:ring-offset-2
		focus-visible:ring-offset-blue-50
		transition-all
		duration-200
	`,

    buttonSecondary: `
		focus-visible:outline-none
		focus-visible:ring-4
		focus-visible:ring-blue-300/60
		focus-visible:ring-offset-2
		focus-visible:ring-offset-blue-50
		transition-all
		duration-200
	`,

    link: `
		focus-visible:outline-none
		focus-visible:underline
		focus-visible:underline-offset-4
		focus-visible:decoration-2
		focus-visible:decoration-blue-500
		transition-all
		duration-200
	`,

	input: `
		focus:outline-none
		focus:ring-4
		focus:ring-blue-500/40
		focus:border-blue-600
		transition-all
		duration-200
	`,
};
