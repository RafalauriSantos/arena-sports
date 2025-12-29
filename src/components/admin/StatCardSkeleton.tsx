import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
	return (
		<Card className="bg-gray-900/40 border-white/5 backdrop-blur-md relative overflow-hidden">
			{/* Efeito Shimmer */}
			<div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />

			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<Skeleton className="h-4 w-24 bg-gray-800" />
				<Skeleton className="h-8 w-8 rounded-lg bg-gray-800" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<Skeleton className="h-7 w-32 bg-gray-800" />
					<Skeleton className="h-3 w-20 bg-gray-800" />
				</div>
			</CardContent>
		</Card>
	);
}
