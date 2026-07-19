import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ArrowRight,
  Sparkles,
  MessageSquare,
  CalendarDays,
  BarChart3,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SEO } from "@/components/SEO";
import { PremiumFooter } from "@/components/PremiumFooter";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { ProductShowcase } from "@/components/landing/ProductShowcase";

/* ---------- PREFERENCE FOR REDUCED MOTION ---------- */
function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setPrefersReducedMotion(media.matches);
    handler();
    if (media.addEventListener) {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }
  }, []);
  return prefersReducedMotion;
}

/* ---------- FAQ DATA ---------- */
const faqList = [
  {
    question: "Quanto tempo leva para começar?",
    answer:
      "A configuração inicial é simples: você cadastra quadras, horários, valores e já pode compartilhar o link de reserva com seus clientes.",
  },
  {
    question: "Meu cliente precisa instalar aplicativo?",
    answer:
      "Não. O cliente acessa o link pelo navegador do celular, escolhe o horário disponível e envia a solicitação de reserva.",
  },
  {
    question: "Eu preciso parar de usar WhatsApp?",
    answer:
      "Não. O WhatsApp pode continuar como canal de relacionamento. A diferença é que a agenda e o controle deixam de depender só das conversas.",
  },
  {
    question: "Como funciona o pagamento da reserva?",
    answer:
      "Você pode manter o fluxo atual: pagamento no local ou combinado pelo WhatsApp. O ArenaSys ajuda a organizar reserva, status e acompanhamento.",
  },
  {
    question: "Funciona para mais de uma quadra?",
    answer:
      "Sim. Você pode cadastrar múltiplas quadras, horários e regras para organizar a disponibilidade da arena em uma visão única.",
  },
  {
    question: "Preciso de cartão para testar?",
    answer:
      "Não. O teste começa sem cartão, para você validar se o fluxo faz sentido na operação real da sua arena.",
  },
  {
    question: "Quanto custa depois do teste?",
    answer:
      "O plano mensal custa R$ 69,90 sem fidelidade. O plano anual Founder custa R$ 397,00 por ano (oferta limitada para os primeiros clientes). Pagamento via Pix, boleto ou cartão pelo Asaas.",
  },
  {
    question: "Posso cancelar se não fizer sentido?",
    answer:
      "Pode. A proposta é simples: testar, validar na rotina e continuar apenas se o ArenaSys ajudar sua operação.",
  },
];

/* ---------- OUTCOME STRIP ---------- */
const outcomes = [
  {
    value: "24/7",
    label: "reservas pelo link",
    desc: "Cliente consulta horários mesmo fora do atendimento da equipe.",
  },
  {
    value: "- mensagens",
    label: "no WhatsApp",
    desc: "A agenda deixa de depender de pergunta e resposta manual.",
  },
  {
    value: "+ controle",
    label: "por quadra",
    desc: "Reservas, bloqueios e pagamentos ficam claros para a operação.",
  },
];

/* ---------- PRODUCT SUITE ---------- */
const products = [
  {
    icon: CalendarDays,
    title: "Reservas por quadra",
    desc: "Mostre horários livres, bloqueios e reservas confirmadas por data, campo e modalidade.",
    result: "Agenda sempre consultável",
    action: "Organizar horários",
    tone: "blue",
  },
  {
    icon: MessageSquare,
    title: "Link público da arena",
    desc: "Compartilhe um endereço simples para o cliente escolher o horário sem instalar aplicativo.",
    result: "Menos conversa operacional",
    action: "Publicar link",
    tone: "cyan",
  },
  {
    icon: BarChart3,
    title: "Painel da operação",
    desc: "Acompanhe ocupação, receita prevista, pendências e fluxo do dia sem abrir planilhas.",
    result: "Decisão mais rápida",
    action: "Ver painel",
    tone: "indigo",
  },
  {
    icon: Users,
    title: "Mensalistas",
    desc: "Separe clientes fixos, horários recorrentes e pendências do fluxo de reservas avulsas.",
    result: "Recorrência sob controle",
    action: "Gerenciar fixos",
    tone: "amber",
  },
];

/* ---------- NAVBAR ---------- */
const navLinks = [
  { href: "#soluções", label: "Soluções" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#pricing", label: "Preços" },
  { href: "#comecar", label: "Começar" },
  { href: "#faq", label: "FAQ" },
];

/* ---------- MAIN COMPONENT ---------- */
function LandingPage() {
  const prefersReducedMotion = usePrefersReducedMotion();

  /* ---------- MOBILE MENU STATE ---------- */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
    <SEO
      title="Sistema de reservas para arenas esportivas | ArenaSys"
      description="Organize quadras, horários, clientes e pagamentos em um link público e um painel simples para sua equipe acompanhar a operação da arena."
      keywords="sistema para gestão de quadras esportivas, sistema de agendamento de quadras, software para quadras esportivas, sistema para arenas esportivas, controle de horários de quadras, gestão de arena esportiva"
      canonical="/"
    />
    <main
      id="main-content"
      className="landing-light relative min-h-dvh overflow-x-hidden scroll-smooth font-sans text-[var(--az-ink)] selection:bg-[var(--az-navy-soft)]"
    >
      {/* ---- Cosmic Background ---- */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(16,185,129,0.15) 0%, transparent 50%),\n          radial-gradient(ellipse 60% 40% at 100% 50%, rgba(6,182,212,0.08) 0%, transparent 40%),\n          radial-gradient(ellipse 60% 40% at 0% 80%, rgba(16,185,129,0.06) 0%, transparent 40%),\n          linear-gradient(180deg, #020205 0%, #030308 50%, #020205 100%)",
        }}
      />

      {/* ---- Aurora & Starfield (only when motion is allowed) ---- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ willChange: "transform" }}>
        {!prefersReducedMotion && (
          <div
            className="absolute -top-5 left-1/2 -translate-x-1/2 w-[200%] h-[100%] opacity-20"
            style={{
              background: `linear-gradient(180deg, transparent 0%, rgba(16,185,129,0.1) 20%, rgba(6,182,212,0.08) 40%, rgba(16,185,129,0.05) 60%, transparent 100%)`,
              animation: "aurora 15s ease-in-out infinite",
              filter: "blur(60px)",
              transform: "translateZ(0)",
            }}
          />
        )}
        {!prefersReducedMotion && (
          <div
            className="absolute w-[100px] h-[1px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
            style={{
              top: "20%",
              left: "0",
              animation: "shootingStar 10s linear infinite",
              animationDelay: "3s",
              willChange: "transform, opacity",
            }}
          />
        )}
      </div>

      {/* ---- Navbar ---- */}
      <header
        data-testid="landing-header"
        className="landing-header fixed left-0 right-0 top-0 z-50 flex flex-col justify-center border-b border-[var(--az-line)] bg-[var(--az-surface)]/95 px-5 py-4 backdrop-blur-md"
      >
        <nav
          className="landing-hero-nav relative flex h-16 w-full max-w-6xl mx-auto items-center justify-between overflow-visible"
        >
          <div className="relative z-10 flex w-full items-center justify-between">
            <a href="#main-content" className="flex items-center rounded-xl py-1.5 group">
              <div className="leading-none">
                <span
                  className="block text-[2.05rem] font-semibold leading-none text-[var(--az-ink)] sm:text-[2.55rem]"
                >
                  ArenaSys
                </span>
              </div>
            </a>

            <div className="hidden items-center gap-2 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="nav-link rounded-lg px-3 py-2 text-[0.93rem] font-semibold text-[var(--az-ink)] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/30"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/login"
                aria-label="Fazer login no ArenaSys"
                className="rounded-lg border border-[var(--az-line)] bg-transparent px-7 py-3 text-[0.93rem] font-semibold text-[var(--az-ink)] transition-colors duration-300 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/30"
                id="btn-login"
              >
                Entrar
              </Link>
              <Link
                to="/login?mode=signup"
                aria-label="Criar agenda online no ArenaSys"
                className="relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-lg bg-[var(--az-navy)] px-7 text-[0.93rem] font-semibold text-white shadow-lg shadow-blue-950/20 transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-[#163a5c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/30"
                id="btn-signup"
              >
                Começar teste grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="relative rounded-lg border border-[var(--az-line)] bg-transparent p-3 text-[var(--az-ink)] backdrop-blur-sm transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/30 md:hidden"
              aria-label={mobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              id="mob-menu-btn"
            >
              <div
                className={`h-0.5 w-5 bg-[var(--az-ink)] transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-[3px]" : ""}`}
                id="menu-line-1"
              />
              <div
                className={`mt-1.5 h-0.5 w-5 bg-[var(--az-ink)] transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""}`}
                id="menu-line-2"
              />
            </button>
          </div>
        </nav>

        {/* ---- Mobile Menu (overlay) ---- */}
        {mobileMenuOpen && (
          <div
            className="absolute left-0 right-0 top-full z-[100] mx-2 mt-3 overflow-hidden rounded-xl animate-in fade-in slide-in-from-top-4 duration-300 md:hidden"
            id="mobile-menu"
          >
            <div
              className="relative rounded-xl border border-[var(--az-line)] bg-[var(--az-surface)] p-5 shadow-[0_24px_56px_-32px_rgba(22,50,79,0.42)]"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg p-4 text-lg font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)] hover:text-[var(--az-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--az-navy)]/40"
                >
                  {link.label}
                </a>
              ))}
              <div className="my-3 h-px bg-[var(--az-line)]" />
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Fazer login no ArenaSys"
                className="block w-full rounded-lg p-4 text-left text-base font-semibold text-[var(--az-ink)] transition-colors hover:bg-[var(--az-paper)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--az-navy)]/40"
                id="mobile-login-btn"
              >
                Entrar
              </Link>
              <Link
                to="/login?mode=signup"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Criar agenda online no ArenaSys"
                className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[var(--az-navy)] text-lg font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--az-navy)]/40"
                id="mobile-signup-btn"
              >
                Começar teste grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

        {/* ---- Hero Section ---- */}
        <section
          className="landing-hero relative isolate overflow-hidden bg-[var(--az-navy)] px-5 pb-16 pt-36 text-white sm:pt-40 lg:pb-24 lg:pt-44"
        >
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-[var(--az-navy)]" />

          {/* Simple gradient overlay */}
          <div
            className="absolute inset-0 bg-[linear-gradient(135deg,rgba(22,50,79,0.98),rgba(47,107,69,0.86))]"
          />

          <div className="relative z-10 mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl space-y-8 text-center mb-16 lg:mb-24">
              <div className="flex flex-wrap justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--az-turf)]/40 bg-[var(--az-turf)]/10 px-3 py-1 text-sm font-semibold text-[var(--az-turf-soft)] backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--az-turf)] opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--az-turf)]"></span>
                  </span>
                  Lançamento Antecipado
                </div>
                <div className="inline-flex items-center rounded-full border border-[var(--az-navy-soft)]/30 bg-[var(--az-navy-soft)]/10 px-3 py-1 text-sm font-semibold text-[var(--az-navy-soft)] backdrop-blur-sm">
                  O CUSTO INVISÍVEL DAS MENSAGENS
                </div>
              </div>

              <div className="space-y-5">
                <h1
                  className="font-display text-[2.75rem] font-bold tracking-tight leading-[1.0] text-white sm:text-5xl md:text-6xl lg:text-[4.1rem] xl:text-[4.6rem]"
                  style={{ color: "#fff", WebkitTextFillColor: "#fff" }}
                >
                  Transforme conversas no WhatsApp em{" "}
                  <span className="text-[var(--az-turf)]">reservas organizadas.</span>
                </h1>
                <p
                  className="mx-auto max-w-2xl text-lg font-medium leading-8 text-blue-50 sm:text-xl"
                  style={{
                    color: "#eff6ff",
                    WebkitTextFillColor: "#eff6ff",
                  }}
                >
                  O dono da arena não perde mais tempo e controle. O cliente reserva pelo link público sem esperar resposta. E sua equipe visualiza horários, clientes e receita em um lugar simples.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 pt-2 sm:flex-row">
                <Link
                  to="/login?mode=signup"
                  className="btn-shine relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-[var(--az-surface)] px-8 text-base font-semibold text-[var(--az-navy)] shadow-[0_18px_38px_-20px_rgba(2,6,23,0.72)] transition-[background-color,transform] duration-200 hover:-translate-y-0.5 hover:bg-[var(--az-paper)] active:scale-[0.98] sm:w-auto sm:min-w-[292px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
                  aria-label="Testar grátis agora - começar teste de 7 dias"
                >
                  Começar teste grátis
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#pricing"
                  className="flex h-14 w-full items-center justify-center whitespace-nowrap rounded-lg border border-white/45 bg-white/12 px-8 text-base font-semibold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/22 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35 sm:w-auto sm:min-w-[210px]"
                  aria-label="Ver oferta Founders"
                >
                  Ver oferta Founders
                </a>
              </div>

              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold text-blue-50">
                <div id="benefit-1" className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-200" />
                  <span
                    style={{ color: "#eff6ff", WebkitTextFillColor: "#eff6ff" }}
                  >
                    Link próprio para reservas
                  </span>
                </div>
                <div id="benefit-2" className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-200" />
                  <span
                    style={{ color: "#eff6ff", WebkitTextFillColor: "#eff6ff" }}
                  >
                    Sem app para o cliente
                  </span>
                </div>
                <div id="benefit-3" className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-amber-200" />
                  <span
                    style={{ color: "#eff6ff", WebkitTextFillColor: "#eff6ff" }}
                  >
                    Pagamento no balcão ou combinado
                  </span>
                </div>
              </div>
            </div>

            {/* Device Mockups Carousel */}
            <div className="relative mx-auto w-full px-2 sm:px-4">
              <ProductShowcase reducedMotion={prefersReducedMotion} />
            </div>
          </div>
        </section>

          {/* ---- Outcome Strip ---- */}
          <section className="relative bg-[var(--az-paper)] px-5 pb-8">
            <div className="mx-auto -mt-8 grid max-w-6xl gap-4 rounded-xl border border-[var(--az-line)] bg-[var(--az-surface)] p-4 shadow-[0_28px_90px_-58px_rgba(22,24,26,0.38)] md:grid-cols-3" id="outcome-strip">
              {outcomes.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] px-5 py-6"
                  id={`outcome-${idx}`}
                >
                  <p className="text-3xl font-semibold text-[var(--az-navy)]">{item.value}</p>
                  <p className="mt-1 text-sm font-semibold uppercase text-[var(--az-ink)]">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--az-ink-soft)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---- Problema Section ---- */}
          <section id="problema" className="relative bg-[var(--az-surface)] px-4 py-16 md:py-20 border-t border-[var(--az-line)]">
            <div className="max-w-5xl mx-auto text-center">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
                O jeito antigo não escala
              </p>
              <h2 className="font-display mb-12 text-3xl font-bold tracking-tight text-[var(--az-ink)] md:text-5xl">
                Quando tudo fica no WhatsApp, a arena perde o controle.
              </h2>
              
              <div className="grid gap-6 md:grid-cols-3 text-left mt-12">
                <div className="rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] p-8 shadow-sm">
                  <MessageSquare className="h-8 w-8 text-red-500 mb-5" />
                  <h3 className="text-xl font-semibold text-[var(--az-ink)] mb-3">Perguntas repetidas</h3>
                  <p className="text-base text-[var(--az-ink-soft)]">"Tem horário hoje às 19h?" A equipe perde horas preciosas do dia apenas respondendo e verificando a mesma coisa manualmente.</p>
                </div>
                <div className="rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] p-8 shadow-sm">
                  <CalendarDays className="h-8 w-8 text-amber-500 mb-5" />
                  <h3 className="text-xl font-semibold text-[var(--az-ink)] mb-3">Conflitos de reserva</h3>
                  <p className="text-base text-[var(--az-ink-soft)]">Agenda no papel ou planilha gera confusão constante. O risco de duas turmas reservarem a mesma quadra é alto.</p>
                </div>
                <div className="rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] p-8 shadow-sm">
                  <BarChart3 className="h-8 w-8 text-blue-500 mb-5" />
                  <h3 className="text-xl font-semibold text-[var(--az-ink)] mb-3">Falta de visão financeira</h3>
                  <p className="text-base text-[var(--az-ink-soft)]">Quem já pagou? Quem ficou de pagar? O fechamento do dia vira uma dor de cabeça sem indicadores simples.</p>
                </div>
              </div>
            </div>
          </section>

          {/* ---- Product Suite ---- */}
          <section id="soluções" className="relative bg-[var(--az-paper)] px-4 py-16 md:py-20 border-t border-[var(--az-line)]">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
                  Soluções para arenas
                </p>
                <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-[var(--az-ink)] md:text-5xl lg:text-6xl">
                  A resposta simples para o caos da sua agenda.
                </h2>
                <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
                  O cliente reserva pelo link. O dono acompanha tudo no painel. A agenda fica organizada, e o fluxo cabe perfeitamente na rotina da arena.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {products.map((product) => {
                  const Icon = product.icon;
                  return (
                  <article
                    key={product.title}
                    className="group flex min-h-[300px] flex-col rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-6 shadow-[0_20px_70px_-55px_rgba(22,24,26,0.45)] transition-all hover:-translate-y-1 hover:border-[var(--az-navy)] hover:shadow-xl hover:shadow-[var(--az-navy)]/10"
                  >
                    <div
                      className={cn(
                        "mb-5 flex h-12 w-12 items-center justify-center rounded-xl border",
                        product.tone === "blue"
                          ? "bg-[var(--az-navy-soft)] text-[var(--az-navy)]"
                          : product.tone === "cyan"
                          ? "bg-[var(--az-turf-soft)] text-[var(--az-turf)]"
                          : product.tone === "indigo"
                          ? "bg-[var(--az-navy-soft)] text-[var(--az-navy)]"
                          : "bg-[var(--az-paper)] text-[var(--az-clay)]"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                    <h3 className="text-xl font-semibold text-[var(--az-ink)]">
                      {product.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-[var(--az-ink-soft)]">
                      {product.desc}
                    </p>
                    <div className="mt-5 rounded-lg border border-[var(--az-line)] bg-[var(--az-paper)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--az-ink-soft)]">
                      {product.result}
                    </div>
                    <Link
                      to="/login?mode=signup"
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--az-navy)] transition-colors group-hover:text-[var(--az-turf)]"
                    >
                      {product.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ---- How It Works (3 steps) ---- */}
          <section id="como-funciona" className="relative bg-[var(--az-paper)] px-4 py-16 md:py-20">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
                  Da primeira quadra ao primeiro link
                </p>
                <h2 className="font-display mb-4 text-3xl font-bold tracking-tight text-[var(--az-ink)] md:text-5xl">
                  Começa simples. Continua organizado.
                </h2>
                <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--az-ink-soft)]">
                  A ideia não é trocar toda a operação de uma vez. É colocar o
                  fluxo principal de reservas em um lugar que a equipe consiga
                  confiar.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    step: "1",
                    title: "Configure a base",
                    desc: "Cadastre quadras, horários, valores e regras principais da sua operação.",
                  },
                  {
                    step: "2",
                    title: "Envie o link",
                    desc: "O cliente consulta disponibilidade e solicita a reserva sem esperar resposta manual.",
                  },
                  {
                    step: "3",
                    title: "Acompanhe no painel",
                    desc: "Sua equipe confirma pagamentos, visualiza reservas e mantém a agenda atualizada.",
                  },
                ].map((item, i) => (
                  <div
                    key={item.step}
                    className="rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-8 text-center shadow-[0_20px_70px_-55px_rgba(22,24,26,0.42)] transition-colors duration-300 hover:border-[var(--az-navy)]"
                  >
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg border border-[var(--az-line)] bg-[var(--az-navy-soft)] text-3xl font-semibold text-[var(--az-navy)]">
                      {item.step}
                    </div>
                    <h3 className="mb-3 text-xl font-semibold text-[var(--az-ink)]">{item.title}</h3>
                    <p className="text-base leading-7 text-[var(--az-ink-soft)]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <LandingPricing onStartTrial={() => window.location.href = "/login?mode=signup"} />

          {/* ---- Next Step Call to Action ---- */}
          <section
            id="comecar"
            className="relative scroll-mt-24 overflow-hidden border-t border-[var(--az-line)] bg-[var(--az-surface)] px-4 py-16 md:py-20"
          >
            <div className="relative z-10 mx-auto max-w-6xl">
              <div className="relative scroll-mt-24 rounded-3xl border border-[var(--az-line)] bg-[var(--az-paper)] px-4 py-16 md:py-20 shadow-sm">
                <div className="max-w-3xl mx-auto text-center">
                  <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
                    Próximo passo
                  </p>
                  <h2 className="font-display max-w-3xl text-3xl font-bold tracking-tight leading-tight text-[var(--az-ink)] md:text-5xl lg:text-6xl">
                    Comece pela próxima reserva.<br />
                    <span className="text-[var(--az-turf)]">Organize o resto a partir dela.</span>
                  </h2>
                  <p className="mx-auto mb-10 max-w-xl text-lg leading-8 text-[var(--az-ink-soft)] lg:justify-self-end">
                    A primeira conversa precisa mostrar valor real: uma agenda
                    publicada, quadras configuradas e um caminho simples para o
                    cliente reservar sem depender de troca de mensagens.
                  </p>
                </div>

                <div className="mb-8 grid gap-4 md:grid-cols-3">
                  {[{
                    label: "Diagnóstico",
                    title: "Ler a operação",
                    desc: "Entender como chegam as reservas, quais quadras entram primeiro e onde a equipe perde tempo.",
                  },
                  {
                    label: "Agenda piloto",
                    title: "Publicar um link real",
                    desc: "Colocar uma versão enxuta no ar para testar o fluxo com reservas da rotina da arena.",
                  },
                  {
                    label: "Decisão",
                    title: "Expandir com segurança",
                    desc: "Depois da validação, ampliar quadras, regras e acompanhamento sem mudar tudo no escuro.",
                  },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="group h-full rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-6 transition-colors duration-300 hover:border-[var(--az-navy)]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--az-ink-soft)]">{item.label}</p>
                      <p className="mt-4 text-2xl font-semibold text-[var(--az-ink)]">{item.title}</p>
                      <p className="mt-3 text-sm leading-6 text-[var(--az-ink-soft)]">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Link
                  to="/login?mode=signup"
                  className="btn-shine relative mt-8 inline-flex h-16 w-full items-center justify-center overflow-hidden rounded-lg bg-[var(--az-navy)] text-lg font-semibold text-white shadow-[0_18px_38px_-20px_rgba(2,6,23,0.72)] transition-colors duration-300 hover:bg-[#163a5c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--az-surface)]"
                  aria-label="Criar minha agenda online - teste grátis de 7 dias"
                >
                  Começar teste grátis
                </Link>
              </div>
            </div>
          </section>

          {/* ---- FAQ Section ---- */}
          <section id="faq" className="relative scroll-mt-24 border-t border-[var(--az-line)] bg-[var(--az-paper)] px-4 py-16 md:py-20">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-16">
                <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--az-navy)]">
                  Antes de testar
                </p>
                <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--az-ink)] md:text-5xl">
                  Respostas diretas para decidir sem enrolação.
                </h2>
              </div>

              <div className="space-y-4">
                {faqList.map((item, i) => (
                  <div
                    key={item.question}
                    className="rounded-lg border border-[var(--az-line)] bg-[var(--az-surface)] p-6 transition-colors duration-300 hover:border-[var(--az-navy)]"
                    id={`faq-${i}`}
                  >
                    <h3
                      className="mb-2 text-lg font-semibold text-[var(--az-ink)]"
                      id={`faq-q-${i}`}
                    >
                      {item.question}
                    </h3>
                    <p className="text-[var(--az-ink-soft)]" id={`faq-a-${i}`}>
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---- Final CTA ---- */}
          <section className="relative overflow-hidden bg-[var(--az-surface)] px-4 py-16 md:py-20">
            {/* Dramatic background */}
            <div className="absolute inset-0">
              <div
                className={cn(
                  "absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--az-navy-soft)] blur-[150px]",
                  !prefersReducedMotion && "animate-pulse-glow",
                )}
              />
            </div>

            <div className="ScrollReveal">
              <div className="max-w-3xl mx-auto text-center relative z-10">
                <h2 className="font-display mb-8 text-4xl font-bold tracking-tight leading-tight text-[var(--az-ink)] md:text-5xl lg:text-6xl">
                  Coloque seu link de reservas no ar.<br />
                  <span className="text-[var(--az-turf)]">Valide em 7 dias com sua rotina real.</span>
                </h2>
                <p className="mx-auto mb-10 max-w-xl text-xl text-[var(--az-ink-soft)]">
                  Teste por 7 dias sem cartão, coloque seu link no ar e veja se o
                  fluxo encaixa na rotina da sua arena.
                </p>
                <Link
                  to="/login?mode=signup"
                  className="btn-shine relative inline-flex h-16 items-center gap-3 overflow-hidden rounded-lg bg-[var(--az-navy)] px-14 text-lg font-semibold text-white shadow-sm transition-[background-color,transform] duration-300 hover:scale-[1.01] hover:bg-[#163a5c] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--az-navy)]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--az-surface)]"
                  aria-label="Começar teste grátis do ArenaSys"
                >
                  Começar teste grátis <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        <PremiumFooter />
    </>
  );
}

export default LandingPage;