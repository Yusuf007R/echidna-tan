import config from "@Configs";
import type EchidnaClient from "@Structures/echidna-client";
import EchidnaSingleton from "@Structures/echidna-singleton";
import { type HttpBindings, serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import authRouter from "./routers/auth";
import guildRouter from "./routers/guild";
import musicPlayerRouter from "./routers/music-player";
import userRouter from "./routers/user";
type Bindings = HttpBindings & {};

export type HonoEnv = {
	Bindings: Bindings;
	Variables: {
		Echidna: EchidnaClient;
	};
};

const app = new Hono<HonoEnv>()
	.use(
		"*",
		cors({
			origin: config.FRONTEND_URL,
			credentials: true,
			// allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
			// allowHeaders: ["Content-Type", "Authorization", "X-Guild-Id"],
			// exposeHeaders: ["Content-Length", "X-Guild-Id"],
			// maxAge: 86400,
		}),
	)
	.use((c, next) => {
		c.set("Echidna", EchidnaSingleton.echidna);
		return next();
	})
	.route("/user", userRouter)
	.route("/auth", authRouter)
	.route("/music", musicPlayerRouter)
	.route("/guild", guildRouter);

export function startServer() {
	serve(
		{
			fetch: app.fetch,
			port: 3069,
		},
		(info) => {
			console.log(`API is running on port ${info.port}`);
		},
	);
}

type AppType = typeof app;

export type { AppType };

export default app;
