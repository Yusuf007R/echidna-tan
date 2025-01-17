import type EchidnaClient from "@Structures/echidna-client";
import type { QueueMetadata } from "@Structures/music-player";
import type { GuildQueue } from "discord-player";
import type { Guild } from "discord.js";
import { createMiddleware } from "hono/factory";

type GuildMiddlewareOptions = {
	fetchMusicQueue?: boolean;
	shouldThrowIfNoQueue?: boolean;
};

type Variables<T extends GuildMiddlewareOptions> = {
	guild: Guild;
	Echidna: EchidnaClient;
} & (T["fetchMusicQueue"] extends true
	? {
			musicQueue: T["shouldThrowIfNoQueue"] extends true
				? GuildQueue<QueueMetadata>
				: GuildQueue<QueueMetadata> | null;
		}
	: // biome-ignore lint/complexity/noBannedTypes: <explanation>
		{});

// biome-ignore lint/complexity/noBannedTypes: <explanation>
const guildMiddleware = <T extends GuildMiddlewareOptions = {}>(
	options: T = {} as T,
) => {
	const { fetchMusicQueue, shouldThrowIfNoQueue } = options;

	return createMiddleware<{
		Variables: Variables<T>;
	}>(async (c, next) => {
		const guildId = c.req.header("X-Guild-Id");

		if (!guildId) {
			return c.json({ error: "Guild ID Header is required" }, 400);
		}

		const guild = await c.get("Echidna").guildsManager.getGuildByID(guildId);

		if (!guild) {
			return c.json({ error: "Guild not found" }, 404);
		}

		// @ts-expect-error Type system limitation with conditional types
		c.set("guild", guild.guild);

		if (fetchMusicQueue) {
			const queue = c.get("Echidna").musicPlayer.nodes.get(guild.guild);
			if (!queue && shouldThrowIfNoQueue) {
				return c.json({ error: "Music queue not found" }, 404);
			}
			// @ts-expect-error Type system limitation with conditional types
			c.set("musicQueue", queue);
		}

		await next();
		return;
	});
};

export default guildMiddleware;
