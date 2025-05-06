import config from "@Configs";
import db from "src/drizzle";

import { encodeBase32LowerCaseNoPadding } from "@oslojs/encoding";
import { Discord } from "arctic";
import { type InferSelectModel, eq, sql } from "drizzle-orm";

import { sessionTable, userTable } from "src/drizzle/schema";

export type Session = InferSelectModel<typeof sessionTable>;
export type User = InferSelectModel<typeof userTable>;

const preparedDbSession = db
	.select()
	.from(sessionTable)
	.innerJoin(userTable, eq(sessionTable.userId, userTable.id))
	.where(eq(sessionTable.id, sql.placeholder("sessionId")))
	.prepare();

export function generateSessionToken(): string {
	const bytes = new Uint8Array(20);
	crypto.getRandomValues(bytes);
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(userId: string) {
	const sessionId = generateSessionToken();
	const session: InferSelectModel<typeof sessionTable> = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
	};
	await db.insert(sessionTable).values(session);
	return session;
}

export async function validateSessionToken(sessionId: string) {
	const result = await preparedDbSession.execute({ sessionId });
	if (result.length < 1) {
		return { session: null, user: null };
	}
	const { user, session } = result[0]!;

	if (Date.now() >= session.expiresAt.getTime()) {
		await db.delete(sessionTable).where(eq(sessionTable.id, session.id));
		return { session: null, user: null };
	}
	if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
		session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
		await db
			.update(sessionTable)
			.set({
				expiresAt: session.expiresAt,
			})
			.where(eq(sessionTable.id, session.id));
	}
	return { session, user };
}

export function createSessionCookie(session?: Session) {
	const url = new URL(config.FRONTEND_URL);
	const domain = url.hostname.split(".").slice(-2).join(".");

	console.log("domain", domain);
	return {
		name: cookieSessionKey,
		value: session?.id ?? "",
		attributes: {
			domain: `.${domain}`,
			secure: true,
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			maxAge: session
				? Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
				: 0,
		},
	} as const;
}

export async function invalidateSession(sessionId: string) {
	return await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
}

export const cookieSessionKey = "echidna_auth_session";

export const discord = new Discord(
	config.DISCORD_BOT_CLIENT_ID,
	config.DISCORD_AUTH_CLIENT_SECRET,
	`${config.API_URL}/auth/callback`,
);
