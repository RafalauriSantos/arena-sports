import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BookingsProvider } from "@/contexts/BookingsContext";
import Login from "./pages/Login";
import Index from "./pages/Index";
import AdminIndex from "./pages/admin/AdminIndex";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BookingsProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* 1. O DONO (Entra no site -> Vai pro Login) */}
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            
            {/* Rotas de Admin */}
            <Route path="/admin/login" element={<Login />} />
            <Route path="/admin/dashboard" element={<AdminIndex />} />
            <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

            {/* 2. O JOGADOR (Link público: /agendar) */}
            <Route path="/agendar" element={<Index />} />
            {/* Redireciona links antigos (/user) para o novo */}
            <Route path="/user" element={<Navigate to="/agendar" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </BookingsProvider>
  </QueryClientProvider>
);

export default App;