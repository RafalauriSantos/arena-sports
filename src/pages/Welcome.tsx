import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Welcome() {
	const navigate = useNavigate();
	const [businessName, setBusinessName] = useState<string>("");
	const timerRef = useRef<number | null>(null);

	useEffect(() => {
		const run = async () => {
			const { data } = await supabase.auth.getSession();
			if (!data.session) {
				navigate("/login", { replace: true });
				return;
			}

			const { data: userData } = await supabase.auth.getUser();
			const metadata = userData.user?.user_metadata as
				| { business_name?: unknown }
				| undefined;
			const nameFromMetadata = metadata?.business_name;
			if (typeof nameFromMetadata === "string") {
				setBusinessName(nameFromMetadata);
			}

			timerRef.current = window.setTimeout(() => {
				navigate("/dashboard", { replace: true });
			}, 900);
		};

		run();

		return () => {
			if (timerRef.current) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [navigate]);

	return (
		<div className="min-h-screen w-full flex bg-[#02040a] text-white relative overflow-hidden font-sans selection:bg-emerald-500/30">
			<div className="absolute inset-0 z-0">
				<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0565c6d?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center" />
				<div className="absolute inset-0 bg-gradient-to-r from-[#02040a] via-[#02040a]/95 to-[#02040a]/40" />
				<div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
			</div>

			<div className="relative z-10 w-full max-w-md mx-auto flex flex-col items-center justify-center px-4 py-10 min-h-[100dvh]">
				<div className="relative w-full">
					<div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-3xl blur opacity-20" />
					<div className="relative bg-[#0a0c10]/90 backdrop-blur-2xl border border-white/10 p-6 rounded-2xl shadow-2xl text-center">
						<div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
							<CheckCircle2 className="w-6 h-6 text-emerald-400" />
						</div>
						<h2 className="text-xl font-bold text-white">Bem-vindo</h2>
						<p className="text-gray-400 text-sm mt-1">
							Preparando {businessName ? businessName : "sua Arena"}…
						</p>

						<div className="mt-6 flex items-center justify-center gap-3 text-gray-300">
							<div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
							<span className="text-sm">Entrando no painel</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
