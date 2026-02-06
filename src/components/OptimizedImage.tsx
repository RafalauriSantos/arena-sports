/**
 * Componente de Imagem Otimizada com Lazy Loading
 * Melhora LCP e performance
 */

import { useState } from "react";

interface OptimizedImageProps {
	src: string;
	alt: string;
	className?: string;
	width?: number;
	height?: number;
	priority?: boolean;
}

export function OptimizedImage({
	src,
	alt,
	className = "",
	width,
	height,
	priority = false,
}: OptimizedImageProps) {
	const [isLoaded, setIsLoaded] = useState(false);

	return (
		<div className={`relative ${className}`} style={{ width, height }}>
			{!isLoaded && (
				<div
					className="absolute inset-0 bg-white/5 animate-pulse"
					role="presentation"
					aria-hidden="true"
				/>
			)}
			<img
				src={src}
				alt={alt}
				loading={priority ? "eager" : "lazy"}
				decoding="async"
				onLoad={() => setIsLoaded(true)}
				className={`${className} transition-opacity duration-300 ${
					isLoaded ? "opacity-100" : "opacity-0"
				}`}
				width={width}
				height={height}
			/>
		</div>
	);
}
