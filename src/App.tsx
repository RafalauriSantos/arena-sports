import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	createBrowserRouter,
	RouterProvider,
	Navigate,
} from "react-router-dom";
import { BookingsProvider } from "@/contexts/BookingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load pages com tratamento de erro
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Welcome = lazy(() => 
	import("./pages/Welcome").catch((error) => {
		console.error("Erro ao carregar Welcome.tsx:", error);
		// Retorna um componente de fallback
		return {
			default: () => (
				<div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center">
					<div className="text-center">
						<p className="text-red-400 mb-4">Erro ao carregar página Welcome</p>
						<button
							onClick={() => window.location.reload()}
							className="px-4 py-2 bg-emerald-500 text-black rounded"
						>
							Recarregar
						</button>
					</div>
				</div>
			),
		};
	})
);
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Support = lazy(() => import("./pages/Support"));
const AdminIndex = lazy(() => import("./pages/admin/AdminIndex"));
const BookingPublic = lazy(() => import("./pages/BookingPublic"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			gcTime: 5 * 60 * 1000,
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			retry: 1,
		},
	},
});

const PageLoader = () => (
	<div className="min-h-screen bg-background flex items-center justify-center">
		<div className="flex flex-col items-center gap-3">
			<div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			<p className="text-sm text-muted-foreground">Carregando...</p>
		</div>
	</div>
);

// Componente de erro para rotas
const RouteErrorElement = () => (
	<div className="min-h-screen bg-[#02040a] text-white flex items-center justify-center p-4">
		<div className="max-w-md w-full space-y-4 text-center">
			<div className="bg-[#0F1115] border border-red-500/20 rounded-2xl p-6">
				<h1 className="text-xl font-bold text-white mb-2">Erro ao carregar página</h1>
				<p className="text-gray-400 text-sm mb-4">
					Não foi possível carregar esta página. Tente recarregar ou voltar para a home.
				</p>
				<div className="flex gap-3 justify-center">
					<button
						onClick={() => window.location.reload()}
						className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded font-bold text-sm"
					>
						Recarregar Página
					</button>
					<a
						href="/"
						className="px-4 py-2 border border-white/20 hover:bg-white/5 rounded text-sm"
					>
						Voltar para Home
					</a>
				</div>
			</div>
		</div>
	</div>
);

const router = createBrowserRouter(
	[
		{ 
			path: "/", 
			element: <Landing />,
			errorElement: <RouteErrorElement />
		},
		{ 
			path: "/login", 
			element: <Login />,
			errorElement: <RouteErrorElement />
		},
		{ 
			path: "/welcome", 
			element: <Welcome />,
			errorElement: <RouteErrorElement />
		},
		{ 
			path: "/privacy", 
			element: <PrivacyPolicy />,
			errorElement: <RouteErrorElement />
		},
		{ 
			path: "/terms", 
			element: <TermsOfService />,
			errorElement: <RouteErrorElement />
		},
		{ 
			path: "/support", 
			element: <Support />,
			errorElement: <RouteErrorElement />
		},

		{ path: "/admin", element: <Navigate to="/dashboard" replace /> },
		{ 
			path: "/dashboard/*", 
			element: <AdminIndex />,
			errorElement: <RouteErrorElement />
		},
		{ 
			path: "/agendar/:subdomain", 
			element: <BookingPublic />,
			errorElement: <RouteErrorElement />
		},

		{ path: "*", element: <NotFound /> },
	],
	{
		future: {
			v7_startTransition: true,
			v7_relativeSplatPath: true,
		},
	}
);

const App = () => (
	<ErrorBoundary>
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<BookingsProvider>
					<TooltipProvider>
						<Toaster />
						<Sonner />
						<Suspense fallback={<PageLoader />}>
							<RouterProvider router={router} />
						</Suspense>
					</TooltipProvider>
				</BookingsProvider>
			</AuthProvider>
		</QueryClientProvider>
	</ErrorBoundary>
);

export default App;
