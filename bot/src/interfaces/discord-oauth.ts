export interface DiscordOAuthUser {
	id: string;
	username: string;
	avatar: string;
	discriminator: string;
	public_flags: number;
	flags: number;
	banner: null;
	accent_color: number;
	global_name: string;
	banner_color: string;
	mfa_enabled: boolean;
	locale: string;
	premium_type: number;
	email: string;
	verified: boolean;
}
