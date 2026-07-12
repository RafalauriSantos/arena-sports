import { useState, useEffect, useRef } from "react";

interface UseCountUpOptions {
	start?: number;
	end: number;
	duration?: number;
	delay?: number;
	decimals?: number;
	prefix?: string;
	suffix?: string;
	onComplete?: () => void;
}

/**
 * Hook para animação de contagem de números estilo Apple
 * Usa timing function ease-out-expo para movimento natural
 */
export function useCountUp({
	start = 0,
	end,
	duration = 2000,
	delay = 0,
	decimals = 0,
	prefix = "",
	suffix = "",
	onComplete,
}: UseCountUpOptions): string {
	const [count, setCount] = useState(start);
	const startTimeRef = useRef<number | null>(null);
	const frameRef = useRef<number | null>(null);
	const hasStartedRef = useRef(false);

	useEffect(() => {
		// Reset when end changes
		setCount(start);
		hasStartedRef.current = false;
		startTimeRef.current = null;
	}, [end, start]);

	useEffect(() => {
		const startAnimation = () => {
			if (hasStartedRef.current) return;
			hasStartedRef.current = true;

			const animate = (timestamp: number) => {
				if (!startTimeRef.current) {
					startTimeRef.current = timestamp;
				}

				const elapsed = timestamp - startTimeRef.current;
				const progress = Math.min(elapsed / duration, 1);

				// Ease-out-expo: começa rápido, desacelera suavemente
				const easeOutExpo =
					progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

				const currentValue = start + (end - start) * easeOutExpo;
				setCount(currentValue);

				if (progress < 1) {
					frameRef.current = requestAnimationFrame(animate);
				} else {
					setCount(end);
					onComplete?.();
				}
			};

			frameRef.current = requestAnimationFrame(animate);
		};

		const timeoutId = setTimeout(startAnimation, delay);

		return () => {
			clearTimeout(timeoutId);
			if (frameRef.current) {
				cancelAnimationFrame(frameRef.current);
			}
		};
	}, [start, end, duration, delay, onComplete]);

	const formattedValue = count.toLocaleString("pt-BR", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
	return `${prefix}${formattedValue}${suffix}`;
}

/**
 * Hook para detectar quando elemento está visível na viewport
 * Útil para trigger de animações on-scroll
 */
export function useInView(
	options: IntersectionObserverInit = {},
): [React.RefObject<HTMLDivElement>, boolean] {
	const ref = useRef<HTMLDivElement>(null);
	const [isInView, setIsInView] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setIsInView(true);
					// Desconecta após primeira vez visível (one-shot)
					observer.disconnect();
				}
			},
			{
				threshold: 0.2,
				rootMargin: "0px 0px -50px 0px",
				...options,
			},
		);

		observer.observe(element);

		return () => observer.disconnect();
	}, [options]);

	return [ref, isInView];
}

export default useCountUp;
