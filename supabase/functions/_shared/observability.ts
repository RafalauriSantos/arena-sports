export type LogLevel = "debug" | "info" | "warn" | "error";

export type RequestLogContext = {
	function_name: string;
	request_id: string;
	correlation_id: string;
	trace_id: string;
	started_at: string;
	start_ms: number;
	tenant_id?: string | null;
	user_id?: string | null;
	subscription_id?: string | null;
	payment_id?: string | null;
	booking_id?: string | null;
};

type LogFields = Record<string, unknown>;

const SENSITIVE_KEY_PATTERN =
	/(authorization|access[_-]?token|api[_-]?key|apikey|secret|password|cpf|cnpj|document|phone|email|invoice[_-]?url|checkout[_-]?url|payment[_-]?url|link|url|payload|customer|response[_-]?body|request[_-]?body)/i;

function uuid() {
	return crypto.randomUUID();
}

function cleanHeader(value: string | null): string | null {
	const trimmed = value?.trim();
	return trimmed || null;
}

function traceIdFromTraceparent(value: string | null): string | null {
	const trimmed = cleanHeader(value);
	if (!trimmed) return null;
	const parts = trimmed.split("-");
	return parts.length >= 2 && parts[1] ? parts[1] : null;
}

export function createRequestContext(
	functionName: string,
	req: Request,
	fields: Partial<RequestLogContext> = {}
): RequestLogContext {
	const requestId = cleanHeader(req.headers.get("x-request-id")) ?? uuid();
	const correlationId =
		cleanHeader(req.headers.get("x-correlation-id")) ?? requestId;
	const traceId =
		traceIdFromTraceparent(req.headers.get("traceparent")) ??
		cleanHeader(req.headers.get("x-trace-id")) ??
		correlationId;

	return {
		function_name: functionName,
		request_id: requestId,
		correlation_id: correlationId,
		trace_id: traceId,
		started_at: new Date().toISOString(),
		start_ms: performance.now(),
		...fields,
	};
}

export function withLogFields(
	context: RequestLogContext,
	fields: Partial<RequestLogContext>
): RequestLogContext {
	return {
		...context,
		...fields,
	};
}

function sanitizeUnknown(value: unknown, key = ""): unknown {
	if (SENSITIVE_KEY_PATTERN.test(key)) {
		return "[redacted]";
	}

	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
		};
	}

	if (Array.isArray(value)) {
		return value.map((item) => sanitizeUnknown(item));
	}

	if (value && typeof value === "object") {
		const output: LogFields = {};
		for (const [entryKey, entryValue] of Object.entries(
			value as Record<string, unknown>
		)) {
			output[entryKey] = sanitizeUnknown(entryValue, entryKey);
		}
		return output;
	}

	return value;
}

export function sanitizeForLog(fields: LogFields): LogFields {
	return sanitizeUnknown(fields) as LogFields;
}

export function errorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	try {
		return JSON.stringify(error);
	} catch {
		return String(error);
	}
}

export function logEvent(
	context: RequestLogContext,
	level: LogLevel,
	event: string,
	fields: LogFields = {}
) {
	const { start_ms: _startMs, ...serializableContext } = context;
	const durationMs = Math.round((performance.now() - context.start_ms) * 100) / 100;
	const record = sanitizeForLog({
		timestamp: new Date().toISOString(),
		level,
		event,
		...serializableContext,
		duration_ms: durationMs,
		...fields,
	});

	const line = JSON.stringify(record);
	if (level === "error") {
		console.error(line);
	} else if (level === "warn") {
		console.warn(line);
	} else {
		console.log(line);
	}
}

export function jsonResponse(
	body: unknown,
	status: number,
	context: RequestLogContext,
	headers: HeadersInit = {}
) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			...headers,
			"Content-Type": "application/json",
			"x-request-id": context.request_id,
			"x-correlation-id": context.correlation_id,
			"x-trace-id": context.trace_id,
		},
	});
}
