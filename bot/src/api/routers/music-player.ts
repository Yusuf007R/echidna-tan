import authMiddleware from "@Api/middlewares/auth-middleware";
import guildMiddleware from "@Api/middlewares/guild-middleware";
import MusicPlayer from "@Structures/music-player";
import { zValidator } from "@hono/zod-validator";

import { QueueRepeatMode } from "discord-player";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import type { HonoEnv } from "..";

const musicRouter = new Hono<HonoEnv>()
	.use(authMiddleware)
	.post(
		"/play",
		guildMiddleware({
			fetchMusicQueue: true,
			shouldThrowIfNoQueue: false,
		}),
		(c) => {
			// TODO: implement this
			const musicQueue = c.get("musicQueue");

			if (!musicQueue) {
				return c.json({ error: "Music queue not found" }, 404);
			}

			return c.json({ message: "Added to queue" });
		},
	)
	.use(
		guildMiddleware({
			fetchMusicQueue: true,
			shouldThrowIfNoQueue: true,
		}),
	)
	.get("/events", (c) => {
		const musicQueue = c.get("musicQueue");
		const eventEmitter = MusicPlayer.getGuildEmitter(musicQueue.guild.id);
		return streamSSE(c, async (stream) => {
			eventEmitter.on("update", (data) => {
				stream.writeSSE({
					data: JSON.stringify(MusicPlayer.getPlayerStatus(data.queue)),
					event: data.type,
				});
			});
		});
	})
	.get("/status", (c) => {
		const musicQueue = c.get("musicQueue");

		return c.json(MusicPlayer.getPlayerStatus(musicQueue));
	})
	.post("/pause", (c) => {
		c.get("musicQueue").node.pause();

		return c.json({ message: "Paused" });
	})
	.post("/resume", (c) => {
		c.get("musicQueue").node.resume();

		return c.json({ message: "Resumed" });
	})
	.post("/stop", (c) => {
		c.get("musicQueue").node.stop();

		return c.json({ message: "Stopped" });
	})
	.post("/skip", (c) => {
		c.get("musicQueue").node.skip();

		return c.json({ message: "Skipped" });
	})
	.post(
		"/volume",
		zValidator(
			"query",
			z.object({
				volume: z.number(),
			}),
		),
		(c) => {
			const { volume } = c.req.valid("query");

			c.get("musicQueue").node.setVolume(volume);

			return c.json({ message: "Volume set" });
		},
	)
	.post(
		"/seek",
		zValidator(
			"query",
			z.object({
				seek: z.number(),
			}),
		),
		(c) => {
			const { seek } = c.req.valid("query");

			c.get("musicQueue").node.seek(seek);

			return c.json({ message: "Seeked" });
		},
	)
	.get(
		"/loop",
		zValidator(
			"query",
			z.object({
				mode: z.nativeEnum(QueueRepeatMode),
			}),
		),
		(c) => {
			const { mode } = c.req.valid("query");

			c.get("musicQueue").setRepeatMode(mode);

			return c.json({ message: "Loop mode set" });
		},
	)
	.get("/toggle-shuffle", (c) => {
		c.get("musicQueue").toggleShuffle();

		return c.json({ message: "Shuffled" });
	});

export default musicRouter;
