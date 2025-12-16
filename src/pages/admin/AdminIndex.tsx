import { useState } from "react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import Dashboard from "./Dashboard";
import AgendaMaster from "./AgendaMaster";
import FolgasView from "./FolgasView";
import FinanceiroView from "./FinanceiroView";
import ConfiguracoesView from "./ConfiguracoesView";

export default function AdminIndex() {
	const [activeView, setActiveView] = useState("dashboard");

	const handleLogout = () => {
		window.location.href = "/admin/login";
	};

	const renderView = () => {
		switch (activeView) {
			case "dashboard":
				return <Dashboard />;
			case "agenda":
				return <AgendaMaster />;
			case "folgas":
				return <FolgasView />;
			case "financeiro":
				return <FinanceiroView />;
			case "configuracoes":
				return <ConfiguracoesView />;
			default:
				return <Dashboard />;
		}
	};

	return (
		<AdminLayout
			activeView={activeView}
			onViewChange={setActiveView}
			onLogout={handleLogout}>
			{renderView()}
		</AdminLayout>
	);
}
