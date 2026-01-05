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

// Lazy load pages
const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Welcome = lazy(() => import("./pages/Welcome"));
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

const router = createBrowserRouter(
	[
		{ path: "/", element: <Landing /> },
		{ path: "/login", element: <Login /> },
		{ path: "/welcome", element: <Welcome /> },
		{ path: "/privacy", element: <PrivacyPolicy /> },
		{ path: "/terms", element: <TermsOfService /> },
		{ path: "/support", element: <Support /> },

		{ path: "/admin", element: <Navigate to="/dashboard" replace /> },
		{ path: "/dashboard/*", element: <AdminIndex /> },
		{ path: "/agendar/:subdomain", element: <BookingPublic /> },

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
);

export default App;
