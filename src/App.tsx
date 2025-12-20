import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BookingsProvider } from "@/contexts/BookingsContext";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Index = lazy(() => import("./pages/Index"));
const AdminIndex = lazy(() => import("./pages/admin/AdminIndex"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimized QueryClient configuration
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000, // 1 minute
			gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			retry: 1,
		},
	},
});

// Loading fallback component
const PageLoader = () => (
	<div className="min-h-screen bg-background flex items-center justify-center">
		<div className="flex flex-col items-center gap-3">
			<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			<p className="text-sm text-muted-foreground">Carregando...</p>
		</div>
	</div>
);

const App = () => (
	<QueryClientProvider client={queryClient}>
		<BookingsProvider>
			<TooltipProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<Suspense fallback={<PageLoader />}>
						<Routes>
							{/* Landing Page - Vitrine do Negócio */}
							<Route path="/" element={<Landing />} />

							{/* Rotas de Admin */}
							<Route path="/admin/login" element={<Login />} />
							<Route path="/admin/dashboard" element={<AdminIndex />} />
							<Route path="/admin" element={<Login />} />

							{/* O JOGADOR (Link público: /agendar) */}
							<Route path="/agendar" element={<Index />} />

							<Route path="*" element={<NotFound />} />
						</Routes>
					</Suspense>
				</BrowserRouter>
			</TooltipProvider>
		</BookingsProvider>
	</QueryClientProvider>
);

export default App;
