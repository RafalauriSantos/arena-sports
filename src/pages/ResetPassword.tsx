import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const strongPasswordMessage =
	"A senha deve ter no mínimo 8 caracteres, com maiúscula, minúscula, número e símbolo.";
const isStrongPassword = (value: string) =>
	value.trim().length >= 8 &&
	/[a-z]/.test(value) &&
	/[A-Z]/.test(value) &&
	/\d/.test(value) &&
	/[^A-Za-z0-9]/.test(value);

const ResetPassword = () => {
	const navigate = useNavigate();
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isRecoveryMode, setIsRecoveryMode] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const canSubmit = useMemo(() => {
		return (
			isRecoveryMode &&
			!isLoading &&
			isStrongPassword(password) &&
			password === confirmPassword
		);
	}, [confirmPassword, isLoading, isRecoveryMode, password]);

	useEffect(() => {
		let mounted = true;

		const initRecovery = async () => {
			setError(null);
			setMessage(null);

			try {
				const sp = new URLSearchParams(window.location.search);
				const code = sp.get("code");

				if (code) {
					const { error: exchangeError } =
						await supabase.auth.exchangeCodeForSession(code);
					if (exchangeError) {
						throw exchangeError;
					}
				}

				const hash = new URLSearchParams(
					window.location.hash.replace(/^#/, ""),
				);
				const hashType = hash.get("type");

				const { data } = await supabase.auth.getSession();
				const hasSession = Boolean(data.session?.user);

				if (hashType === "recovery" || hasSession) {
					if (!mounted) return;
					setIsRecoveryMode(true);
					setMessage("Informe sua nova senha para concluir a recuperação.");
				} else {
					if (!mounted) return;
					setIsRecoveryMode(false);
					setError(
						"Link inválido ou expirado. Solicite um novo link de recuperação.",
					);
				}
			} catch (err) {
				if (!mounted) return;
				const msg = err instanceof Error ? err.message : String(err);
				setIsRecoveryMode(false);
				setError(
					`Não foi possível validar o link de recuperação: ${msg || "erro desconhecido"}`,
				);
			} finally {
				if (mounted) setIsInitializing(false);
			}
		};

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY") {
				setIsRecoveryMode(true);
				setError(null);
				setMessage("Informe sua nova senha para concluir a recuperação.");
			}
		});

		void initRecovery();

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, []);

	const handleReset = async () => {
		setError(null);
		setMessage(null);

		if (!isStrongPassword(password)) {
			setError(strongPasswordMessage);
			return;
		}

		if (password !== confirmPassword) {
			setError("As senhas não coincidem.");
			return;
		}

		setIsLoading(true);

		const { error } = await supabase.auth.updateUser({
			password,
		});

		if (error) {
			setIsLoading(false);
			setError(`Erro ao atualizar senha: ${error.message}`);
			return;
		}

		await supabase.auth.signOut();
		setIsLoading(false);
		setPassword("");
		setConfirmPassword("");
		navigate("/login?mode=signin&password_reset=1", { replace: true });
	};

	return (
		<div className="relative min-h-screen overflow-hidden bg-[#06090f] p-4 text-white sm:p-6">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -left-16 top-12 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
				<div className="absolute right-0 top-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
				<div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
			</div>

			<div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md items-center justify-center">
				<div className="w-full rounded-3xl border border-white/10 bg-[#0d131d]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
					<div className="mb-5 flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-500/15">
							<ShieldCheck className="h-5 w-5 text-emerald-300" />
						</div>
						<div>
							<h1 className="text-2xl font-bold tracking-tight text-white">
								Redefinir senha
							</h1>
							<p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
								Fluxo seguro ArenaSys
							</p>
						</div>
					</div>

					<p className="text-sm leading-relaxed text-slate-300">
						{isInitializing ?
							"Validando seu link de recuperação..."
						: isRecoveryMode ?
							"Escolha uma senha forte para concluir o acesso da sua conta."
						:	"Não conseguimos validar este link. Solicite um novo email de recuperação."
						}
					</p>

					{message && (
						<div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
							{message}
						</div>
					)}

					{error && (
						<div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
							{error}
						</div>
					)}

					<div className="mt-5 space-y-4">
						<div className="space-y-1.5">
							<Label
								htmlFor="new-password"
								className="text-xs uppercase tracking-wide text-slate-300">
								Nova senha
							</Label>
							<div className="relative">
								<Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									id="new-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Mínimo 8 caracteres"
									autoComplete="new-password"
									className="h-11 rounded-xl border-white/15 bg-white/5 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500/40"
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label
								htmlFor="confirm-password"
								className="text-xs uppercase tracking-wide text-slate-300">
								Confirmar nova senha
							</Label>
							<div className="relative">
								<Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<Input
									id="confirm-password"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="Repita a nova senha"
									autoComplete="new-password"
									className="h-11 rounded-xl border-white/15 bg-white/5 pl-10 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500/40"
								/>
							</div>
						</div>
					</div>

					<Button
						type="button"
						onClick={handleReset}
						disabled={!canSubmit}
						className="mt-6 h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-sm font-semibold text-[#05120d] hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50">
						{isLoading ? "Salvando..." : "Salvar nova senha"}
					</Button>

					<button
						type="button"
						onClick={() =>
							navigate("/login?mode=forgot-password", { replace: true })
						}
						className="mt-3 w-full text-center text-sm text-slate-300 underline decoration-slate-500 underline-offset-4 hover:text-white">
						Solicitar novo link de recuperação
					</button>
				</div>
			</div>
		</div>
	);
};

export default ResetPassword;
