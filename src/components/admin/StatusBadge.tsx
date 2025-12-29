import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "error" | "neutral";

interface StatusBadgeProps {
	status: StatusType;
	children: React.ReactNode;
	className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
	const styles = {
		// Verde Neon com Glow para sucesso (Confirmado, Pago)
		success:
			"bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.25)] hover:bg-primary/20",
		// Âmbar para atenção (Pendente, Aguardando)
		warning:
			"bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20",
		// Vermelho para erro (Cancelado, Bloqueado)
		error:
			"bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20",
		// Cinza para neutro (Inativo, Rascunho)
		neutral: "bg-gray-500/10 text-gray-400 border-gray-500/20",
	};

	return (
		<Badge
			variant="outline"
			className={cn(
				"border backdrop-blur-md font-medium transition-all",
				styles[status],
				className
			)}>
			{children}
		</Badge>
	);
}
