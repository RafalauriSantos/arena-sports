/**
 * Input de CPF/CNPJ com formatação automática
 * Toggle entre CPF e CNPJ + máscara visual
 */

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface CpfCnpjInputProps {
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

// Formata CPF: 123.456.789-01
const formatCPF = (value: string): string => {
	const numbers = value.replace(/\D/g, "");
	if (numbers.length <= 3) return numbers;
	if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
	if (numbers.length <= 9)
		return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
	return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

// Formata CNPJ: 12.345.678/0001-90
const formatCNPJ = (value: string): string => {
	const numbers = value.replace(/\D/g, "");
	if (numbers.length <= 2) return numbers;
	if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
	if (numbers.length <= 8)
		return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
	if (numbers.length <= 12)
		return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
	return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

// Validação básica de CPF
const isValidCPF = (cpf: string): boolean => {
	const numbers = cpf.replace(/\D/g, "");
	if (numbers.length !== 11) return false;
	if (/^(\d)\1+$/.test(numbers)) return false; // Todos iguais
	return true;
};

// Validação básica de CNPJ
const isValidCNPJ = (cnpj: string): boolean => {
	const numbers = cnpj.replace(/\D/g, "");
	if (numbers.length !== 14) return false;
	if (/^(\d)\1+$/.test(numbers)) return false; // Todos iguais
	return true;
};

export function CpfCnpjInput({ value, onChange, className }: CpfCnpjInputProps) {
	const cleanValue = value?.replace(/\D/g, "") || "";
	
	// Auto-detecta tipo baseado no tamanho
	const [type, setType] = useState<"cpf" | "cnpj">(
		cleanValue.length > 11 ? "cnpj" : "cpf"
	);

	const isCpf = type === "cpf";
	const maxLength = isCpf ? 11 : 14;
	const formatted = isCpf ? formatCPF(cleanValue) : formatCNPJ(cleanValue);
	const isComplete = cleanValue.length === maxLength;
	const isValid = isComplete && (isCpf ? isValidCPF(cleanValue) : isValidCNPJ(cleanValue));

	// Atualiza tipo quando troca manualmente
	const handleTypeChange = (newType: "cpf" | "cnpj") => {
		setType(newType);
		// Limpa o campo ao trocar
		onChange("");
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const numbers = e.target.value.replace(/\D/g, "");
		
		// Limita ao tamanho máximo
		if (numbers.length <= maxLength) {
			onChange(numbers);
		}
	};

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-center justify-between">
				<Label className="text-gray-300">CPF/CNPJ</Label>
				
				{/* Toggle CPF/CNPJ */}
				<div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
					<button
						type="button"
						onClick={() => handleTypeChange("cpf")}
						className={cn(
							"px-3 py-1 text-xs font-bold rounded transition-all",
							isCpf
								? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
								: "text-gray-400 hover:text-white"
						)}
					>
						CPF
					</button>
					<button
						type="button"
						onClick={() => handleTypeChange("cnpj")}
						className={cn(
							"px-3 py-1 text-xs font-bold rounded transition-all",
							!isCpf
								? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
								: "text-gray-400 hover:text-white"
						)}
					>
						CNPJ
					</button>
				</div>
			</div>

			{/* Input com formatação visual */}
			<div className="relative">
				<Input
					type="text"
					value={formatted}
					onChange={handleInputChange}
					placeholder={isCpf ? "000.000.000-00" : "00.000.000/0000-00"}
					className={cn(
						"bg-white/5 border-white/10 text-white pr-10",
						isComplete && isValid && "border-green-500/50 bg-green-500/5",
						isComplete && !isValid && "border-red-500/50 bg-red-500/5"
					)}
					autoComplete="off"
				/>

				{/* Ícone de validação */}
				{isComplete && (
					<div className="absolute right-3 top-1/2 -translate-y-1/2">
						{isValid ? (
							<CheckCircle2 className="w-5 h-5 text-green-500 animate-in zoom-in duration-300" />
						) : (
							<AlertCircle className="w-5 h-5 text-red-500 animate-in zoom-in duration-300" />
						)}
					</div>
				)}
			</div>

			{/* Dica e validação */}
			<div className="flex items-start gap-2 text-xs">
				{isComplete && !isValid ? (
					<p className="text-red-400 flex items-center gap-1">
						<AlertCircle className="w-3 h-3" />
						{isCpf ? "CPF inválido" : "CNPJ inválido"}
					</p>
				) : isComplete && isValid ? (
					<p className="text-green-400 flex items-center gap-1">
						<CheckCircle2 className="w-3 h-3" />
						{isCpf ? "CPF válido" : "CNPJ válido"}
					</p>
				) : (
					<p className="text-gray-500">
						{isCpf 
							? `Digite ${11 - cleanValue.length} dígitos restantes`
							: `Digite ${14 - cleanValue.length} dígitos restantes`
						}
					</p>
				)}
			</div>
		</div>
	);
}
