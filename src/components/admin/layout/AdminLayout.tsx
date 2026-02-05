import { ReactNode, useState, useEffect, useRef } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
	children: ReactNode;
	activeView: string;
	onViewChange: (view: string) => void;
	onLogout: () => void;
}

export function AdminLayout({
	children,
	activeView,
	onViewChange,
	onLogout,
}: AdminLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const mainRef = useRef<HTMLElement>(null);

	// Ensure scroll to top when view changes
	useEffect(() => {
		// Immediate scroll - multiple methods for maximum compatibility
		const scrollToTop = () => {
			window.scrollTo(0, 0);
			window.scrollTo({ top: 0, left: 0, behavior: "instant" });
			document.documentElement.scrollTop = 0;
			document.body.scrollTop = 0;

			// Also ensure main element scrolls to top
			if (mainRef.current) {
				mainRef.current.scrollTop = 0;
			}
		};

		// Immediate execution
		scrollToTop();

		// Also execute after a microtask to catch any late DOM updates
		setTimeout(scrollToTop, 0);
	}, [activeView]);

	return (
		<div className="bg-gray-950 text-gray-50 font-sans selection:bg-primary/30">
			{/* Mobile Header - Always visible and compact */}
			<div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5 px-3 py-2 flex items-center justify-between">
				<h1 className="text-base font-bold text-white">ArenaSys</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setSidebarOpen(!sidebarOpen)}
					data-testid="button-sidebar-mobile-toggle">
					{sidebarOpen ? (
						<X className="h-5 w-5" />
					) : (
						<Menu className="h-5 w-5" />
					)}
				</Button>
			</div>

			{/* Mobile Sidebar Drawer */}
			{sidebarOpen && (
				<div
					className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Sidebar - Hidden on mobile, shown as drawer if open */}
			<div
				className={`md:block ${
					sidebarOpen ? "fixed" : "hidden"
				} md:relative z-40`}>
				<AdminSidebar
					activeView={activeView}
					onViewChange={(view) => {
						onViewChange(view);
						setSidebarOpen(false);
					}}
					onLogout={onLogout}
				/>
			</div>

			{/* Main Content Area */}
			<main
				ref={mainRef}
				className="md:ml-64 pt-16 md:pt-8 px-4 md:px-8 py-4 md:py-8">
				<div className="max-w-7xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
