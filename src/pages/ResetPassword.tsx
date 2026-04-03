import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const ResetPassword = () => {
	const [password, setPassword] = useState("");
	const [isRecoveryMode, setIsRecoveryMode] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const hash = window.location.hash;
		console.log("HASH:", hash);

		if (hash && hash.includes("access_token")) {
			setIsRecoveryMode(true);
			console.log("Sessão detectada via URL");
		}
	}, []);

	const handleReset = async () => {
		if (!password.trim()) {
			alert("Digite uma nova senha.");
			return;
		}

		setIsLoading(true);

		const { error } = await supabase.auth.updateUser({
			password,
		});

		setIsLoading(false);

		if (error) {
			alert(`Erro ao atualizar senha: ${error.message}`);
			return;
		}

		alert("Senha atualizada com sucesso.");
		setPassword("");
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
			<div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
				<h1 className="text-xl font-semibold text-slate-900">
					Redefinir senha
				</h1>
				<p className="mt-2 text-sm text-slate-600">
					{isRecoveryMode ?
						"Modo de recuperação ativo. Informe sua nova senha."
					:	"Aguardando modo de recuperação de senha..."}
				</p>

				<div className="mt-4">
					<label
						htmlFor="new-password"
						className="mb-2 block text-sm font-medium text-slate-700">
						Nova senha
					</label>
					<input
						id="new-password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Digite sua nova senha"
						className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
					/>
				</div>

				<button
					type="button"
					onClick={handleReset}
					disabled={isLoading}
					className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
					{isLoading ? "Salvando..." : "Salvar"}
				</button>
			</div>
		</div>
	);
};

export default ResetPassword;
