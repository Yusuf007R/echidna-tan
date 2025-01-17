import type { HonoEnv } from "@Api/index";
import authMiddleware from "@Api/middlewares/auth-middleware";

import { Hono } from "hono";

const userRouter = new Hono<HonoEnv>()
	.use("*", authMiddleware)
	.get("/me", (c) => {
		const user = c.get("user");

		return c.json(user);
	});

export default userRouter;
