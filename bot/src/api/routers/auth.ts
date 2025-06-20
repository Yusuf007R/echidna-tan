import {
	cookieSessionKey,
	createSession,
	createSessionCookie,
	discord,
} from "@Api/auth";
import type { HonoEnv } from "@Api/index";
import config from "@Configs";
import type { DiscordOAuthUser } from "@Interfaces/discord-oauth";
import { zValidator } from "@hono/zod-validator";
import { generateState } from "arctic";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import db from "src/drizzle";
import { sessionTable, userTable } from "src/drizzle/schema";
import { z } from "zod";

export type jwtPayload = {
	userId: string;
	userName: string;
	exp: number;
};

const authRouter = new Hono<HonoEnv>()
	.get("/login", (c) => {
		const state = generateState();
		const scopes = ["identify", "guilds"];

		const cookieOptions = {
			path: "/",
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
			maxAge: 60 * 10,
			sameSite: "lax",
		} as const;
		setCookie(c, "discord_oauth_state", state, cookieOptions);
		const url = discord.createAuthorizationURL(state, null, scopes);
		return c.redirect(url, 302);
	})
	.get(
		"/callback",
		zValidator("query", z.object({ code: z.string(), state: z.string() })),
		async (c) => {
			try {
				const { code, state } = c.req.valid("query");
				const storeState = getCookie(c, "discord_oauth_state");
				if (!code || !state || !storeState || storeState !== state) {
					return c.json({ error: "Invalid request" }, 400);
				}

				const tokens = await discord.validateAuthorizationCode(code, null);
				const response = await fetch("https://discord.com/api/users/@me", {
					headers: {
						Authorization: `Bearer ${tokens.accessToken()}`,
					},
				});

				if (!response.ok) {
					return c.json({ error: "Failed to fetch user" }, 500);
				}

				const user = (await response.json()) as DiscordOAuthUser;
				let dbUser = await db.query.userTable.findFirst({
					where: eq(userTable.id, user.id),
				});

				if (!dbUser) {
					dbUser = (
						await db
							.insert(userTable)
							.values({
								id: user.id,
								displayName: user.global_name,
								userName: user.username,
							})
							.returning()
					)?.at(0);

					if (!dbUser) {
						return c.json({ error: "Failed to create user" }, 500);
					}
				}

				const session = await createSession(dbUser.id);

				const cookie = createSessionCookie(session);

				setCookie(c, cookie.name, cookie.value, cookie.attributes);

				return c.redirect(config.FRONTEND_URL, 302);
			} catch (error) {
				console.error(error);
				return c.json({ error: "Internal server error" }, 500);
			}
		},
	)
	.get("/logout", async (c) => {
		const sessionId = getCookie(c, cookieSessionKey);

		if (!sessionId) {
			return c.json({ error: "Unauthorized" }, 401);
		}

		await db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
		return c.json({ message: "Logged out" });
	});

export default authRouter;
