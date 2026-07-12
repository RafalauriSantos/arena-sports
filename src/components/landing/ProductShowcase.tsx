import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ProductShowcaseProps = {
  reducedMotion: boolean;
};

export function ProductShowcase({ reducedMotion }: ProductShowcaseProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      id: "desktop",
      caption: "PARA QUEM GERE A ARENA",
      image: "/images/mockup-dashboard.png",
      alt: "Dashboard do sistema ArenaSys no desktop",
      testId: "owner-dashboard-mockup"
    },
    {
      id: "mobile",
      caption: "PARA QUEM FAZ A RESERVA",
      image: "/images/mockup-mobile.png",
      alt: "Interface mobile de agendamento de quadras do ArenaSys",
      testId: "customer-booking-mockup"
    }
  ];

  useEffect(() => {
    if (reducedMotion) return;
    
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000); // 6 seconds for better reading
    
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const nextSlide = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));
  const prevSlide = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));

  return (
    <div className="relative w-full mx-auto max-w-[1200px]" aria-label="Demonstração do ArenaSys">
      <div className="relative overflow-hidden rounded-2xl aspect-[4/3] sm:aspect-[16/10] lg:aspect-[16/9] flex items-center justify-center">
        
        {slides.map((slide, index) => {
          let positionClass = "opacity-0 translate-x-full"; // next
          if (activeSlide === index) {
            positionClass = "opacity-100 translate-x-0 z-10"; // active
          } else if (activeSlide > index) {
            positionClass = "opacity-0 -translate-x-full"; // prev
          }

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4 transition-all duration-700 ease-in-out ${positionClass}`}
            >
              <p className="mb-2 sm:mb-6 text-xs sm:text-sm font-semibold uppercase tracking-widest text-white/80 drop-shadow-md">
                {slide.caption}
              </p>
              <img
                src={slide.image}
                alt={slide.alt}
                data-testid={slide.testId}
                className={`w-auto max-w-full object-contain transition-transform duration-1000 ${
                  activeSlide === index && !reducedMotion ? "scale-100" : "scale-95"
                } ${slide.id === "mobile" ? "max-h-[85%] md:max-h-[90%]" : "max-h-[95%] md:max-h-[100%] w-[95%] md:w-full"}`}
                style={slide.id === "desktop" ? { filter: "drop-shadow(0 25px 35px rgba(0,0,0,0.4))" } : {}}
              />
            </div>
          );
        })}

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 z-20 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white/80 backdrop-blur-md transition hover:bg-black/40 hover:text-white"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 z-20 top-1/2 -translate-y-1/2 rounded-full bg-black/20 p-2 text-white/80 backdrop-blur-md transition hover:bg-black/40 hover:text-white"
          aria-label="Próximo slide"
        >
          <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
        </button>
      </div>

      {/* Dots */}
      <div className="mt-8 flex justify-center gap-3 relative z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              activeSlide === index ? "w-8 bg-[var(--az-turf)]" : "w-2.5 bg-white/30 hover:bg-white/50"
            }`}
            aria-label={`Ir para o slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
