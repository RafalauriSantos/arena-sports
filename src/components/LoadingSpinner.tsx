/**
 * Loading Component - Otimizado para Accessibility
 */

export function LoadingSpinner() {
	return (
		<div
			className="min-h-screen marketing-dark text-white flex items-center justify-center"
			role="status"
			aria-label="Carregando">
			<div className="flex flex-col items-center gap-4">
				<div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
				<p className="text-gray-300 text-sm">Carregando...</p>
				<span className="sr-only">Aguarde enquanto o conteúdo é carregado</span>
			</div>
		</div>
	);
}

export function LoadingInline() {
	return (
		<div
			className="flex items-center justify-center py-8"
			role="status"
			aria-label="Carregando">
			<div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
			<span className="sr-only">Carregando...</span>
		</div>
	);
}
