/* eslint-disable react-refresh/only-export-components */
import {
	createContext,
	useContext,
	useEffect,
	useCallback,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const getStringProp = (value: unknown, key: string): string | undefined => {
	if (!isRecord(value)) return undefined;
	const v = value[key];
	return typeof v === "string" ? v : undefined;
};

const isNetworkOfflineError = (err: unknown) => {
	// Chrome/Edge commonly throws TypeError('Failed to fetch') when offline,
	// and Supabase may wrap it into a plain object.
	const message =
		err instanceof Error ? err.message : getStringProp(err, "message") ?? "";
	const details = getStringProp(err, "details") ?? "";
	return (
		(typeof navigator !== "undefined" && navigator.onLine === false) ||
		/failed to fetch|internet_disconnected|networkerror/i.test(message) ||
		/failed to fetch|internet_disconnected|networkerror/i.test(details)
	);
};

interface UserProfile {
	id?: string;
	tenant_id?: string | null;
	full_name?: string | null;
	email?: string | null;
	avatar_url?: string | null;
	job_title?: string | null;
}

interface AuthContextValue {
	user: User | null;
	userProfile?: UserProfile | null;
	tenantId: string | null;
	loading: boolean;
	authOperationLoading: boolean;
	updateProfile?: (
		updates: Partial<UserProfile>
	) => Promise<UserProfile | null>;
	signOut?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const fetchProfile = async (userId: string) => {
	const { data, error } = await supabase
		.from("profiles")
		.select("id, tenant_id, full_name, email, avatar_url, job_title")
		.eq("id", userId)
		.maybeSingle();

	if (error) throw error;
	return data as UserProfile | null;
};

const isUniqueViolation = (err: unknown) => {
	const code = getStringProp(err, "code") ?? "";
	const message = getStringProp(err, "message") ?? "";
	return code === "23505" || /duplicate key|unique/i.test(message);
};

const ensureProfileRowById = async (userId: string, email?: string | null) => {
	// Verificar se o perfil já existe antes de tentar inserir
	const existing = await fetchProfile(userId);
	if (existing) return;

	// Se não existe, criar usando upsert (mais seguro que insert)
	try {
		const payload: Record<string, unknown> = { id: userId };
		if (email) payload.email = email;
		const { error } = await supabase
			.from("profiles")
			.upsert(payload, { onConflict: "id" });
		if (error) {
			// Se ainda assim der erro de violação única, significa que foi criado em outra thread
			if (isUniqueViolation(error)) return;
			throw error;
		}
	} catch (err) {
		// Ignorar apenas erros de violação única (registro já existe)
		if (isUniqueViolation(err)) return;
		throw err;
	}
};

const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
	// Garantir que o perfil existe (se não existir, será criado)
	await ensureProfileRowById(userId);

	// Atualizar o perfil usando .update() (assume que já existe)
	const { data, error } = await supabase
		.from("profiles")
		.update(updates)
		.eq("id", userId)
		.select("id, tenant_id, full_name, email, avatar_url, job_title")
		.maybeSingle();

	if (error) {
		// Se o erro for "not found" ou similar, tentar upsert como fallback
		const message = getStringProp(error, "message") ?? "";
		if (/not found|does not exist|no rows/i.test(message)) {
			// Fallback: usar upsert se o registro não foi encontrado
			const payload = { id: userId, ...updates };
			const { data: upsertData, error: upsertError } = await supabase
				.from("profiles")
				.upsert(payload, { onConflict: "id" })
				.select("id, tenant_id, full_name, email, avatar_url, job_title")
				.maybeSingle();
			if (upsertError) throw upsertError;
			return (upsertData ?? (await fetchProfile(userId))) as UserProfile;
		}
		throw error;
	}

	return (data ?? (await fetchProfile(userId))) as UserProfile;
};

const fetchTenant = async (tenantId: string | null) => {
	if (!tenantId) return null;
	const { data, error } = await supabase
		.from("tenants")
		.select("id")
		.eq("id", tenantId)
		.maybeSingle();
	if (error) throw error;
	return data;
};

const slugifySubdomain = (input: string) => {
	const base = (input || "arena")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return base || "arena";
};

const isMissingFunctionError = (err: unknown, fnName: string) => {
	const message = getStringProp(err, "message") ?? "";
	return (
		/does not exist/i.test(message) &&
		new RegExp(fnName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(message)
	);
};

const ensureProfile = async (user: User) => {
	let profile = await fetchProfile(user.id);
	if (profile) return profile;

	await ensureProfileRowById(user.id, user.email ?? null);
	profile = await fetchProfile(user.id);
	return profile;
};

const fallbackOnboardUser = async (user: User, businessName: string) => {
	const baseSubdomain = slugifySubdomain(businessName);
	const suffix = (user.id || "").replace(/-/g, "").slice(0, 6) || "owner";

	let lastError: unknown = null;
	for (let attempt = 0; attempt < 3; attempt++) {
		const candidateSubdomain =
			attempt === 0
				? `${baseSubdomain}-${suffix}`
				: `${baseSubdomain}-${suffix}-${attempt + 1}`;

		const { data: tenant, error: tenantError } = await supabase
			.from("tenants")
			.insert({
				owner_id: user.id,
				business_name: businessName,
				subdomain: candidateSubdomain,
			})
			.select("id")
			.single();

		if (tenantError) {
			lastError = tenantError;
			const message = String(tenantError.message || "");
			if (/duplicate key|unique/i.test(message)) {
				continue;
			}
			throw tenantError;
		}

		await updateProfile(user.id, { tenant_id: tenant.id });
		return;
	}

	throw lastError ?? new Error("Falha ao criar tenant");
};

const onboardUser = async (businessName: string) => {
	const { error } = await supabase.rpc("fn_onboard_user", {
		p_business_name: businessName,
		p_saas_slug: "arena-sports",
	});
	if (error) throw error;
};

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [tenantId, setTenantId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [authOperationLoading, setAuthOperationLoading] = useState(false);
	const onboardingState = useRef<{ userId: string | null; attempts: number }>({
		userId: null,
		attempts: 0,
	});

	// Função padrão de signOut do Supabase
	const signOut = useCallback(async () => {
		await supabase.auth.signOut();
		setUser(null);
		setUserProfile(null);
		setTenantId(null);
	}, []);

	useEffect(() => {
		let mounted = true;

		const handleSession = async (session: Session | null) => {
			if (!mounted) return;
			const sessionUser = session?.user ?? null;
			setUser(sessionUser);

			// Only treat as authenticated when there's an access token.
			// This prevents calling RPCs with the anon key (auth.uid() would be null).
			const hasAccessToken = Boolean(session?.access_token);

			if (!sessionUser || !hasAccessToken) {
				setTenantId(null);
				setLoading(false);
				onboardingState.current = { userId: null, attempts: 0 };
				return;
			}

			// Reset onboarding attempts when the logged user changes.
			if (onboardingState.current.userId !== sessionUser.id) {
				onboardingState.current = { userId: sessionUser.id, attempts: 0 };
			}

			setLoading(true);
			try {
				let profile = await ensureProfile(sessionUser);

				const userMetadata = sessionUser.user_metadata as unknown as Record<
					string,
					unknown
				>;
				const businessNameFromMetadata =
					(typeof userMetadata.business_name === "string"
						? userMetadata.business_name
						: undefined) ||
					(typeof userMetadata.arena_name === "string"
						? userMetadata.arena_name
						: undefined);
				const desiredBusinessName =
					typeof businessNameFromMetadata === "string" &&
					businessNameFromMetadata.trim()
						? businessNameFromMetadata.trim()
						: "Minha Arena";

				// Retry a few times across session changes if tenant_id is still missing.
				if (!profile?.tenant_id && onboardingState.current.attempts < 3) {
					onboardingState.current.attempts += 1;
					try {
						await onboardUser(desiredBusinessName);
					} catch (err) {
						// Se a RPC não existir (ou falhar por qualquer motivo), fazemos fallback no client
						// usando as policies owner-only do MVP.
						if (isMissingFunctionError(err, "fn_onboard_user")) {
							await fallbackOnboardUser(sessionUser, desiredBusinessName);
						} else {
							await fallbackOnboardUser(sessionUser, desiredBusinessName);
						}
					}
					profile = await fetchProfile(sessionUser.id);
				}

				if (profile?.tenant_id) {
					// Mark onboarding as done for this session user.
					onboardingState.current.attempts = 3;
				}

				setUserProfile(profile ?? null);
				// Fonte de verdade do app: tenant_id do profile.
				setTenantId(profile?.tenant_id ?? null);
			} catch (error) {
				const message = getStringProp(error, "message") ?? "";
				const errorRecord = isRecord(error) ? error : undefined;
				console.error("AuthContext error", {
					message,
					code: errorRecord?.code,
					details: errorRecord?.details,
					hint: errorRecord?.hint,
					status: errorRecord?.status,
				});

				// Offline / network issues are transient: keep the last known profile/tenant
				// to avoid bouncing the user into paywall or logout loops.
				if (isNetworkOfflineError(error)) {
					return;
				}
				// If something smells like auth/session problems, sign out to stop loops.
				if (
					/invalid jwt|jwt expired|not authenticated|unauthorized|invalid refresh token/i.test(
						message
					)
				) {
					try {
						await supabase.auth.signOut();
					} catch {
						// ignore
					}
					setUser(null);
					setUserProfile(null);
				}
				setTenantId(null);
			} finally {
				if (mounted) setLoading(false);
			}
		};

		supabase.auth.getSession().then(({ data }) => {
			handleSession(data.session ?? null);
		});

		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				// Even on TOKEN_REFRESHED we may need to rehydrate profile/tenant_id.
				handleSession(session ?? null);
			}
		);

		return () => {
			mounted = false;
			listener?.subscription.unsubscribe();
		};
	}, []);

	const doUpdateProfile = useCallback(
		async (updates: Partial<UserProfile>) => {
			if (!user) throw new Error("Not authenticated");
			const updated = await updateProfile(user.id, updates);
			setUserProfile(updated);
			return updated;
		},
		[user]
	);

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			userProfile,
			tenantId,
			loading,
			authOperationLoading,
			updateProfile: doUpdateProfile,
			signOut,
		}),
		[
			doUpdateProfile,
			loading,
			authOperationLoading,
			signOut,
			tenantId,
			user,
			userProfile,
		]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
