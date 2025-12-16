import { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

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
	return (
		<div className="min-h-screen bg-background">
			<AdminSidebar
				activeView={activeView}
				onViewChange={onViewChange}
				onLogout={onLogout}
			/>

			{/* Main Content Area */}
			<main className="ml-64 p-8">
				<div className="max-w-7xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
