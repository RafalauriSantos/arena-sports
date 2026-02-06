import { cn } from "@/lib/utils";

/**
 * Componentes de Loading e Skeletons para melhor UX
 */

export function LoadingSpinner({
	className,
	size = "md",
}: {
	className?: string;
	size?: "sm" | "md" | "lg";
}) {
	const sizeClasses = {
		sm: "w-4 h-4",
		md: "w-6 h-6",
		lg: "w-8 h-8",
	};

	return (
		<div
			className={cn(
				"border-2 border-current border-t-transparent rounded-full animate-spin",
				sizeClasses[size],
				className
			)}
		/>
	);
}

export function PageLoading({
	message = "Carregando...",
}: {
	message?: string;
}) {
	return (
		<div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center">
			<div className="text-center space-y-4">
				<LoadingSpinner size="lg" className="text-emerald-500 mx-auto" />
				<p className="text-gray-300 text-sm">{message}</p>
			</div>
		</div>
	);
}

export function ButtonLoading({
	children,
	loading,
	className,
	...props
}: {
	children: React.ReactNode;
	loading: boolean;
	className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			className={cn(
				"flex items-center justify-center gap-2 transition-all",
				loading && "cursor-not-allowed opacity-70",
				className
			)}
			disabled={loading}
			{...props}>
			{loading && <LoadingSpinner size="sm" className="text-current" />}
			{children}
		</button>
	);
}

export function CardSkeleton() {
	return (
		<div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
			<div className="h-4 bg-white/10 rounded animate-pulse" />
			<div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
			<div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
		</div>
	);
}

export function TableSkeleton({
	rows = 5,
	cols = 4,
}: {
	rows?: number;
	cols?: number;
}) {
	return (
		<div className="space-y-3">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="flex gap-4">
					{Array.from({ length: cols }).map((_, j) => (
						<div
							key={j}
							className="h-4 bg-white/10 rounded animate-pulse flex-1"
						/>
					))}
				</div>
			))}
		</div>
	);
}

export function FormSkeleton() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="h-4 bg-white/10 rounded animate-pulse w-1/4" />
				<div className="h-10 bg-white/5 rounded animate-pulse" />
			</div>
			<div className="space-y-2">
				<div className="h-4 bg-white/10 rounded animate-pulse w-1/3" />
				<div className="h-10 bg-white/5 rounded animate-pulse" />
			</div>
			<div className="space-y-2">
				<div className="h-4 bg-white/10 rounded animate-pulse w-1/2" />
				<div className="h-10 bg-white/5 rounded animate-pulse" />
			</div>
			<div className="h-10 bg-emerald-500/20 rounded animate-pulse" />
		</div>
	);
}
