import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorInfo: { componentStack: string } | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
		console.error("ErrorBoundary capturou um erro:", error, errorInfo);
		this.setState({
			error,
			errorInfo,
		});
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
		// Recarregar a página para limpar o estado
		window.location.reload();
	};

	handleGoHome = () => {
		window.location.href = "/";
	};

	render() {
		if (this.state.hasError) {
			// Renderiza fallback customizado se fornecido
			if (this.props.fallback) {
				return this.props.fallback;
			}

			// Renderiza UI de erro padrão
			return (
				<div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center p-4">
					<div className="max-w-md w-full space-y-6">
						<div className="bg-[#0F1115] border border-red-500/20 rounded-2xl p-6 shadow-2xl">
							<div className="flex items-center gap-3 mb-4">
								<div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
									<AlertTriangle className="w-5 h-5 text-red-400" />
								</div>
								<h1 className="text-xl font-bold text-white">
									Erro ao carregar página
								</h1>
							</div>

							<p className="text-gray-300 text-sm mb-2">
								Ocorreu um erro ao carregar esta página. Isso pode ser causado por:
							</p>

							<ul className="text-gray-300 text-xs space-y-1 mb-6 list-disc list-inside">
								<li>Problema de conexão com o servidor</li>
								<li>Arquivo de módulo não encontrado</li>
								<li>Cache desatualizado do navegador</li>
							</ul>

							{this.state.error && (
								<details className="mb-6">
									<summary className="text-xs text-gray-300 cursor-pointer hover:text-gray-300 mb-2">
										Detalhes técnicos (clique para expandir)
									</summary>
									<pre className="text-[10px] text-red-400 bg-[#0a0c10] p-3 rounded border border-red-500/20 overflow-auto max-h-40">
										{this.state.error.toString()}
										{this.state.errorInfo?.componentStack && (
											<>
												{"\n\n"}
												{this.state.errorInfo.componentStack}
											</>
										)}
									</pre>
								</details>
							)}

							<div className="flex flex-col sm:flex-row gap-3">
								<Button
									onClick={this.handleReset}
									className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
								>
									<RefreshCw className="w-4 h-4 mr-2" />
									Recarregar Página
								</Button>
								<Button
									onClick={this.handleGoHome}
									variant="outline"
									className="flex-1 border-white/20 hover:bg-white/5"
								>
									<Home className="w-4 h-4 mr-2" />
									Ir para Home
								</Button>
							</div>
						</div>

						<div className="text-center text-xs text-gray-600">
							Se o problema persistir, tente limpar o cache do navegador (Ctrl+Shift+R) ou
							entre em contato com o suporte.
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
