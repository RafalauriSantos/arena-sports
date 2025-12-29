import React, { useRef, useState } from "react";
import { Camera, Check } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function AvatarUpload() {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const { user, userProfile, updateProfile } = useAuth();
	const [uploading, setUploading] = useState(false);
	const { toast } = useToast();

	const initials =
		(userProfile?.full_name || "")
			.split(" ")
			.map((n) => n?.[0])
			.slice(0, 2)
			.join("") || "A";

	const handleChoose = () => inputRef.current?.click();

	const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !user) return;
		setUploading(true);
		try {
			const filePath = `${user.id}/${Date.now()}_${file.name}`;
			const { error: uploadError } = await supabase.storage
				.from("avatars")
				.upload(filePath, file, { upsert: true });
			if (uploadError) throw uploadError;

			const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
			const publicUrl = data.publicUrl;

			// Save to profiles
			if (!updateProfile) throw new Error("updateProfile not available");
			await updateProfile({ avatar_url: publicUrl });

			toast({
				title: "Avatar enviado",
				description: "Sua foto foi atualizada.",
			});
		} catch (err) {
			console.error(err);
			toast({
				title: "Erro",
				description: "Não foi possível enviar o avatar.",
				variant: "destructive",
			});
		} finally {
			setUploading(false);
			// reset input value so same file can be re-uploaded if needed
			if (inputRef.current) inputRef.current.value = "";
		}
	};

	return (
		<div className="flex flex-col items-center gap-3">
			<div className="relative">
				<Avatar className="w-24 h-24">
					{userProfile?.avatar_url ? (
						<AvatarImage
							src={userProfile.avatar_url}
							alt={userProfile.full_name ?? "Avatar"}
						/>
					) : (
						<AvatarFallback>{initials}</AvatarFallback>
					)}
				</Avatar>

				<button
					type="button"
					onClick={handleChoose}
					className="absolute right-0 bottom-0 -translate-y-1/4 -translate-x-1/4 bg-black/60 hover:bg-black/70 text-white p-2 rounded-full shadow-md transition-opacity opacity-90">
					{uploading ? (
						<span className="h-4 w-4 animate-spin border-2 border-white/30 border-t-white rounded-full block" />
					) : (
						<Camera className="h-4 w-4" />
					)}
				</button>

				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					onChange={handleFile}
					className="hidden"
				/>
			</div>
			<Button
				variant="ghost"
				size="sm"
				onClick={handleChoose}
				disabled={uploading}>
				{uploading ? "Enviando..." : "Alterar foto"}
			</Button>
		</div>
	);
}
