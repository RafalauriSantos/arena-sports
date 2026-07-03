import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPageProps = {
	children: ReactNode;
	className?: string;
};

export function AdminPage({ children, className }: AdminPageProps) {
	return (
		<div className={cn("space-y-5 text-slate-950 md:space-y-6", className)}>
			{children}
		</div>
	);
}

type AdminPageHeaderProps = {
	eyebrow?: string;
	title: string;
	description?: ReactNode;
	meta?: ReactNode;
	actions?: ReactNode;
	className?: string;
};

export function AdminPageHeader({
	eyebrow,
	title,
	description,
	meta,
	actions,
	className,
}: AdminPageHeaderProps) {
	return (
		<header
			className={cn(
				"flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between",
				className,
			)}>
			<div className="min-w-0 space-y-2">
				{eyebrow && (
					<p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0b71ee]">
						{eyebrow}
					</p>
				)}
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-[2rem]">
						{title}
					</h1>
					{description && (
						<div className="max-w-2xl text-sm leading-6 text-slate-500">
							{description}
						</div>
					)}
				</div>
				{meta && <div className="flex flex-wrap gap-2 pt-1">{meta}</div>}
			</div>
			{actions && <div className="flex shrink-0 flex-col gap-2 sm:flex-row">{actions}</div>}
		</header>
	);
}

type AdminToolbarProps = {
	children: ReactNode;
	className?: string;
};

export function AdminToolbar({ children, className }: AdminToolbarProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:flex-row md:items-center md:justify-between",
				className,
			)}>
			{children}
		</div>
	);
}

type SegmentedOption<T extends string> = {
	value: T;
	label: string;
};

type AdminSegmentedControlProps<T extends string> = {
	value: T;
	options: Array<SegmentedOption<T>>;
	onChange: (value: T) => void;
	className?: string;
};

export function AdminSegmentedControl<T extends string>({
	value,
	options,
	onChange,
	className,
}: AdminSegmentedControlProps<T>) {
	return (
		<div
			className={cn(
				"grid w-full grid-cols-3 gap-1 rounded-md bg-slate-100 p-1 sm:w-auto",
				className,
			)}>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					className={cn(
						"h-8 rounded px-3 text-sm font-semibold transition-colors",
						value === option.value ?
							"bg-white text-[#062b6f] shadow-sm ring-1 ring-slate-200"
						:	"text-slate-500 hover:text-slate-900",
					)}>
					{option.label}
				</button>
			))}
		</div>
	);
}

type AdminMetricProps = {
	label: string;
	value: ReactNode;
	icon?: ReactNode;
	tone?: "blue" | "amber" | "slate" | "red";
	className?: string;
};

const metricTone = {
	blue: "bg-blue-50 text-[#0b71ee] ring-blue-100",
	amber: "bg-amber-50 text-amber-700 ring-amber-100",
	slate: "bg-slate-100 text-slate-700 ring-slate-200",
	red: "bg-red-50 text-red-600 ring-red-100",
};

export function AdminMetric({
	label,
	value,
	icon,
	tone = "slate",
	className,
}: AdminMetricProps) {
	return (
		<div
			className={cn(
				"flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm",
				className,
			)}>
			{icon && (
				<div
					className={cn(
						"flex h-9 w-9 shrink-0 items-center justify-center rounded-md ring-1",
						metricTone[tone],
					)}>
					{icon}
				</div>
			)}
			<div className="min-w-0">
				<p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
					{label}
				</p>
				<div className="mt-0.5 truncate text-xl font-semibold tabular-nums text-slate-950">
					{value}
				</div>
			</div>
		</div>
	);
}

type AdminPanelProps = {
	children: ReactNode;
	className?: string;
};

export function AdminPanel({ children, className }: AdminPanelProps) {
	return (
		<section
			className={cn(
				"overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm",
				className,
			)}>
			{children}
		</section>
	);
}

type AdminEmptyStateProps = {
	icon?: ReactNode;
	title: string;
	description?: ReactNode;
	action?: ReactNode;
	className?: string;
};

export function AdminEmptyState({
	icon,
	title,
	description,
	action,
	className,
}: AdminEmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center px-4 py-14 text-center",
				className,
			)}>
			{icon && (
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-[#0b71ee] ring-1 ring-blue-100">
					{icon}
				</div>
			)}
			<h3 className="text-base font-semibold text-slate-950">{title}</h3>
			{description && (
				<p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
					{description}
				</p>
			)}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

type AdminPillProps = {
	children: ReactNode;
	tone?: "blue" | "amber" | "slate" | "red";
	className?: string;
};

const pillTone = {
	blue: "border-blue-100 bg-blue-50 text-[#0b71ee]",
	amber: "border-amber-100 bg-amber-50 text-amber-700",
	slate: "border-slate-200 bg-slate-100 text-slate-600",
	red: "border-red-100 bg-red-50 text-red-600",
};

export function AdminPill({ children, tone = "slate", className }: AdminPillProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
				pillTone[tone],
				className,
			)}>
			{children}
		</span>
	);
}

type AdminIconButtonProps = {
	children: ReactNode;
	onClick: () => void;
	"aria-label": string;
	className?: string;
};

export function AdminIconButton({
	children,
	onClick,
	className,
	"aria-label": ariaLabel,
}: AdminIconButtonProps) {
	return (
		<button
			type="button"
			aria-label={ariaLabel}
			onClick={onClick}
			className={cn(
				"inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200",
				className,
			)}>
			{children}
		</button>
	);
}
