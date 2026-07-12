import React from "react";

type ProductShowcaseProps = {
  reducedMotion: boolean;
};

export function ProductShowcase({ reducedMotion }: ProductShowcaseProps) {
  const animationClass = reducedMotion ? "" : "landing-device-float";

  return (
    <div className="landing-product-showcase" aria-label="Demonstração do ArenaSys">
      <div className={`landing-product-laptop ${animationClass}`}>
        <p className="landing-product-caption">Para quem gere a arena</p>
        <img
          src="/images/mockup-dashboard.png"
          alt="Notebook exibindo o painel ArenaSys com agenda, ocupação e receita da arena"
          data-testid="owner-dashboard-mockup"
          className="landing-product-image"
        />
      </div>
      <div className={`landing-product-phone ${animationClass}`}>
        <p className="landing-product-caption">Para quem faz a reserva</p>
        <img
          src="/images/mockup-mobile.png"
          alt="iPhone exibindo a reserva pública com datas, quadra e horários disponíveis"
          data-testid="customer-booking-mockup"
          className="landing-product-image"
        />
      </div>
    </div>
  );
}
