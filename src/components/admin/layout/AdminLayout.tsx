import { ReactNode, useState } from "react";
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

        return (
                <div className="min-h-screen bg-background">
                        {/* Mobile Header */}
                        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
                                <h1 className="text-lg font-bold text-gradient-primary">E-SPORTIVO</h1>
                                <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSidebarOpen(!sidebarOpen)}
                                        data-testid="button-sidebar-mobile-toggle"
                                >
                                        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                                </Button>
                        </div>

                        {/* Mobile Sidebar Drawer */}
                        {sidebarOpen && (
                                <div 
                                        className="md:hidden fixed inset-0 z-40 bg-black/50"
                                        onClick={() => setSidebarOpen(false)}
                                />
                        )}

                        {/* Sidebar - Hidden on mobile, shown as drawer if open */}
                        <div className={`md:block ${sidebarOpen ? 'fixed' : 'hidden'} md:relative md:h-screen md:flex md:flex-col z-40`}>
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
                        <main className="md:ml-64 pt-16 md:pt-0 p-4 md:p-8">
                                <div className="max-w-7xl mx-auto">{children}</div>
                        </main>
                </div>
        );
}
