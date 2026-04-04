import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

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
			password.trim().length >= 6 &&
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

		if (password.trim().length < 6) {
			setError("A senha deve ter no mínimo 6 caracteres.");
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
		<div className="min-h-screen flex items-center justify-center bg-[#0a0c10] p-4">
			<div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-sm">
				<h1 className="text-2xl font-bold text-white">Redefinir senha</h1>
				<p className="mt-2 text-sm text-gray-300">
					{isInitializing ?
						"Validando link de recuperação..."
					: isRecoveryMode ?
						"Crie uma nova senha para sua conta ArenaSys."
					:	"Link de recuperação inválido ou expirado."}
				</p>

				{message && (
					<div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
						{message}
					</div>
				)}

				{error && (
					<div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
						{error}
					</div>
				)}

				<div className="mt-4 space-y-3">
					<label
						htmlFor="new-password"
						className="block text-xs uppercase tracking-wide text-gray-300">
						Nova senha
					</label>
					<input
						id="new-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Mínimo 6 caracteres"
						className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
					/>

					<label
						htmlFor="confirm-password"
						className="block text-xs uppercase tracking-wide text-gray-300">
						Confirmar nova senha
					</label>
					<input
						id="confirm-password"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder="Repita a senha"
						className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400"
					/>
				</div>

				<button
					type="button"
					onClick={handleReset}
					disabled={!canSubmit}
					className="mt-5 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-emerald-400 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50">
					{isLoading ? "Salvando..." : "Salvar nova senha"}
				</button>

				<button
					type="button"
					onClick={() =>
						navigate("/login?mode=forgot-password", { replace: true })
					}
					className="mt-3 w-full text-sm text-gray-300 underline hover:text-white">
					Solicitar novo link
				</button>
			</div>
		</div>
	);
};

export default ResetPassword;
