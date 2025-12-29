import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function OccupancyCardSkeleton() {
	return (
		<Card className="bg-gray-900/40 border-white/5 backdrop-blur-md relative overflow-hidden">
			{/* Efeito Shimmer */}
			<div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />

			<CardHeader className="pb-3">
				<div className="flex justify-between items-start">
					<Skeleton className="h-5 w-32 bg-gray-800" />
					<Skeleton className="h-8 w-8 rounded-lg bg-gray-800" />
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex justify-between">
						<Skeleton className="h-4 w-20 bg-gray-800" />
						<Skeleton className="h-4 w-12 bg-gray-800" />
					</div>
					<Skeleton className="h-2 w-full bg-gray-800" />
				</div>
				<div className="pt-4 border-t border-white/10 flex justify-between items-center">
					<Skeleton className="h-4 w-24 bg-gray-800" />
					<Skeleton className="h-6 w-16 bg-gray-800" />
				</div>
			</CardContent>
		</Card>
	);
}
