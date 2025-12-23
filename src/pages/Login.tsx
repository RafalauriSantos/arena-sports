//login page for admin access
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export default function Login() {
	const navigate = useNavigate();
	const [adminEmail, setAdminEmail] = useState("");
	const [adminPassword, setAdminPassword] = useState("");

	const handleAdminLogin = (e: React.FormEvent) => {
		e.preventDefault();

		// Simulação para teste: aceita qualquer email com "@" e senha com número.
		if (adminEmail.includes("@") && /\d/.test(adminPassword)) {
			navigate("/admin/dashboard");
		} else {
			alert(
				"Credenciais inválidas. O email deve conter '@' e a senha deve conter um número."
			);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				{/* Logo/Brand */}
				<div className="text-center space-y-2">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border-2 border-primary/20 mb-4">
						<Shield className="h-8 w-8 text-primary" />
					</div>
					<h1 className="text-4xl font-black text-gradient-primary">
						Arena Sports
					</h1>
					<p className="text-muted-foreground">
						Painel Administrativo - Acesso Restrito
					</p>
				</div>

				{/* Admin Login Card */}
				<Card className="border-primary/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Lock className="h-5 w-5 text-primary" />
							Acesso Administrativo
						</CardTitle>
						<CardDescription>
							Digite suas credenciais para acessar o painel de gestão
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleAdminLogin} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">E-mail</Label>
								<div className="relative">
									<Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="email"
										type="email"
										placeholder="qualquer@email.com"
										className="pl-9"
										value={adminEmail}
										onChange={(e) => setAdminEmail(e.target.value)}
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Senha</Label>
								<div className="relative">
									<Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										id="password"
										type="password"
										placeholder="••••••••"
										className="pl-9"
										value={adminPassword}
										onChange={(e) => setAdminPassword(e.target.value)}
										required
									/>
								</div>
							</div>

							<Button type="submit" className="w-full gap-2 glow-primary">
								<Shield className="h-4 w-4" />
								Entrar no Painel Admin
							</Button>
						</form>

						{/* Demo Credentials */}
						<div className="mt-4 p-3 bg-muted rounded-lg">
							<p className="text-xs text-muted-foreground text-center">
								<strong>Exemplo:</strong> qualquer@email.com / senha123
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Footer */}
				<div className="text-center">
					<div className="text-xs text-muted-foreground">
						<p>© 2025 Arena Sports. Todos os direitos reservados.</p>
						<p className="mt-1">Desenvolvido por Rafael Lauri Santos</p>
					</div>
				</div>
			</div>
		</div>
	);
}
