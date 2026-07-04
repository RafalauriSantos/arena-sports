import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdminPageProps = {
	children: ReactNode;
	className?: string;
};

export function AdminPage({ children, className }: AdminPageProps) {
	return (
		<div
			className={cn(
				"space-y-5 text-[color:var(--az-ink)] md:space-y-6",
				className,
			)}>
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
				"flex flex-col gap-4 border-b-[0.5px] border-[color:var(--az-line)] pb-5 md:flex-row md:items-end md:justify-between",
				className,
			)}>
			<div className="min-w-0 space-y-2">
				{eyebrow && (
					<p className="text-[11px] font-medium uppercase tracking-normal text-[color:var(--az-ink-soft)]">
						{eyebrow}
					</p>
				)}
				<div className="space-y-1">
					<h1 className="font-['Archivo'] text-[21px] font-semibold leading-7 tracking-normal text-[color:var(--az-ink)]">
						{title}
					</h1>
					{description && (
						<div className="max-w-2xl text-[13px] leading-5 text-[color:var(--az-ink-soft)]">
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
				"flex flex-col gap-3 rounded-[var(--az-radius-card)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] p-2 md:flex-row md:items-center md:justify-between",
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
				"grid w-full grid-cols-3 gap-1 rounded-[var(--az-radius-control)] bg-[color:var(--az-navy-soft)] p-1 sm:w-auto",
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
							"bg-[color:var(--az-surface)] text-[color:var(--az-navy)] ring-[0.5px] ring-[color:var(--az-line)]"
						:	"text-[color:var(--az-ink-soft)] hover:text-[color:var(--az-ink)]",
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
	tone?: "navy" | "clay" | "turf" | "muted" | "blue" | "amber" | "slate" | "red";
	className?: string;
};

const metricTone = {
	navy: "bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)] ring-[color:var(--az-line)]",
	clay: "bg-[color:var(--az-surface)] text-[color:var(--az-clay)] ring-[color:var(--az-line)]",
	turf: "bg-[color:var(--az-surface)] text-[color:var(--az-turf)] ring-[color:var(--az-line)]",
	muted: "bg-[color:var(--az-surface)] text-[color:var(--az-ink-soft)] ring-[color:var(--az-line)]",
	blue: "bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)] ring-[color:var(--az-line)]",
	amber: "bg-[color:var(--az-surface)] text-[color:var(--az-clay)] ring-[color:var(--az-line)]",
	slate: "bg-[color:var(--az-surface)] text-[color:var(--az-ink-soft)] ring-[color:var(--az-line)]",
	red: "bg-[color:var(--az-surface)] text-[color:var(--az-clay)] ring-[color:var(--az-line)]",
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
				"flex min-h-[92px] min-w-0 items-center gap-3 rounded-[var(--az-radius-card)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] p-4",
				className,
			)}>
			{icon && (
				<div
					className={cn(
						"flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--az-radius-control)] ring-[0.5px]",
						metricTone[tone],
					)}>
					{icon}
				</div>
			)}
			<div className="min-w-0">
				<p className="truncate text-[12px] font-medium leading-4 text-[color:var(--az-ink-soft)]">
					{label}
				</p>
				<div className="mt-1 truncate text-[21px] font-medium leading-7 tabular-nums text-[color:var(--az-ink)]">
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
				"overflow-hidden rounded-[var(--az-radius-card)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)]",
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
				"flex min-h-[190px] flex-col items-center justify-center px-4 py-8 text-center",
				className,
			)}>
			{icon && (
				<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--az-radius-control)] bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)]">
					{icon}
				</div>
			)}
			<h3 className="text-[15px] font-medium text-[color:var(--az-ink)]">
				{title}
			</h3>
			{description && (
				<p className="mt-2 max-w-md text-[13px] leading-5 text-[color:var(--az-ink-soft)]">
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
	blue: "border-[color:var(--az-line)] bg-[color:var(--az-navy-soft)] text-[color:var(--az-navy)]",
	amber: "border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-clay)]",
	slate: "border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink-soft)]",
	red: "border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-clay)]",
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
				"inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--az-radius-control)] border-[0.5px] border-[color:var(--az-line)] bg-[color:var(--az-surface)] text-[color:var(--az-ink-soft)] transition-colors hover:bg-[color:var(--az-navy-soft)] hover:text-[color:var(--az-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--az-navy)]",
				className,
			)}>
			{children}
		</button>
	);
}

export const MetricCard = AdminMetric;
export const EmptyState = AdminEmptyState;
