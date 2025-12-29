import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

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
	updateProfile?: (
		updates: Partial<UserProfile>
	) => Promise<UserProfile | null>;
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

const updateProfile = async (userId: string, updates: Partial<UserProfile>) => {
	const { data, error } = await supabase
		.from("profiles")
		.update(updates)
		.eq("id", userId)
		.single();

	if (error) throw error;
	return data as UserProfile;
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
	const onboardingAttempted = useRef(false);

	useEffect(() => {
		let mounted = true;

		const handleSession = async (sessionUser: User | null) => {
			if (!mounted) return;
			setUser(sessionUser);

			if (!sessionUser) {
				setTenantId(null);
				setLoading(false);
				onboardingAttempted.current = false;
				return;
			}

			setLoading(true);
			try {
				let profile = await fetchProfile(sessionUser.id);

				if (!profile?.tenant_id && !onboardingAttempted.current) {
					onboardingAttempted.current = true;
					await onboardUser("Minha Arena");
					profile = await fetchProfile(sessionUser.id);
				}

				setUserProfile(profile ?? null);

				const tenant = await fetchTenant(profile?.tenant_id ?? null);
				setTenantId(tenant?.id ?? null);
			} catch (error) {
				console.error("AuthContext error", error);
				setTenantId(null);
			} finally {
				if (mounted) setLoading(false);
			}
		};

		supabase.auth.getSession().then(({ data }) => {
			handleSession(data.session?.user ?? null);
		});

		const { data: listener } = supabase.auth.onAuthStateChange(
			(event, session) => {
				if (event === "TOKEN_REFRESHED") {
					setUser(session?.user ?? null);
					return;
				}
				handleSession(session?.user ?? null);
			}
		);

		return () => {
			mounted = false;
			listener?.subscription.unsubscribe();
		};
	}, []);

	const doUpdateProfile = async (updates: Partial<UserProfile>) => {
		if (!user) throw new Error("Not authenticated");
		const updated = await updateProfile(user.id, updates);
		setUserProfile(updated);
		return updated;
	};

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			userProfile,
			tenantId,
			loading,
			updateProfile: doUpdateProfile,
		}),
		[loading, tenantId, user, userProfile]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}
