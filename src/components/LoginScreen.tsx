import { useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { ARENA_CONFIG } from "@/config/arena";
import { cn } from "@/lib/utils";

interface LoginScreenProps {
  onLogin: (phone: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numbers = phone.replace(/\D/g, "");
    if (numbers.length >= 10) {
      setIsLoading(true);
      setShowFlash(true);
      
      setTimeout(() => {
        setShowFlash(false);
        onLogin(numbers);
      }, 800);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e);
    }
  };

  const isValidPhone = phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden safe-area-top safe-area-bottom">
      {/* Flash Effect */}
      {showFlash && (
        <div className="absolute inset-0 bg-primary/30 animate-flash z-50 pointer-events-none" />
      )}

      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-12 text-center">
        {/* Logo */}
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 glow-primary-strong">
            <span className="text-4xl">⚽</span>
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {ARENA_CONFIG.name}
          </h1>
          <p className="text-muted-foreground">
            Reserve seu horário em segundos
          </p>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              WhatsApp do Capitão
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handleKeyDown}
                placeholder="(11) 99999-9999"
                className={cn(
                  "w-full h-16 pl-12 pr-14 text-xl font-semibold bg-card border-2 rounded-2xl outline-none transition-all duration-200 number-display",
                  "placeholder:text-muted-foreground/50 placeholder:font-normal",
                  isValidPhone 
                    ? "border-primary text-foreground glow-primary" 
                    : "border-border text-foreground focus:border-primary/50"
                )}
                autoFocus
              />
              <button
                type="submit"
                disabled={!isValidPhone || isLoading}
                className={cn(
                  "absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 btn-press",
                  isValidPhone
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {showFlash && (
            <p className="text-primary font-semibold animate-pulse">
              ✓ Código enviado!
            </p>
          )}
        </form>

        {/* Footer */}
        <p className="text-xs text-muted-foreground/60">
          Ao continuar, você concorda com nossos termos de uso
        </p>
      </div>
    </div>
  );
}
