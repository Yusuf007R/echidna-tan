import {
	type Session,
	type User,
	cookieSessionKey,
	validateSessionToken,
} from "@Api/auth";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";

const authMiddleware = createMiddleware<{
	Variables: {
		user: User;
		session: Session;
	};
}>(async (c, next) => {
	const sessionId = getCookie(c, cookieSessionKey);
	if (!sessionId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { user, session } = await validateSessionToken(sessionId);
	if (!user || !session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", user);
	c.set("session", session);

	return next();
});
export default authMiddleware;
