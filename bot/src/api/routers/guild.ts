import authMiddleware from "@Api/middlewares/auth-middleware";
import { Hono } from "hono";
import type { HonoEnv } from "..";

const guildRouter = new Hono<HonoEnv>()
	.use(authMiddleware)
	.get("/", async (c) => {
		console.log("guilds");
		const user = c.get("user");

		const guilds = await c
			.get("Echidna")
			.guildsManager.getGuildsByMemberID(user.id);

		return c.json({
			guilds: Array.from(guilds.values()).map(({ guild }) => ({
				id: guild.id,
				name: guild.name,
				banner: guild.bannerURL(),
				icon: guild.iconURL(),
				owner: guild.ownerId === user.id,
			})),
		});
	});

export default guildRouter;
