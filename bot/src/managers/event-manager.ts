import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DiscordEvent, eventType } from "@Structures/discord-events";
import EchidnaSingleton from "@Structures/echidna-singleton";
import { Collection } from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class EventManager extends EchidnaSingleton {
	events: Collection<string, { type: eventType; event: DiscordEvent }>;

	constructor() {
		super();
		this.events = new Collection<
			string,
			{ type: eventType; event: DiscordEvent }
		>();
	}

	async init() {
		await this.loadEvents();
		this.listenEvent();
	}

	async loadEvents() {
		const eventsRootFolder = join(__dirname, "/events");
		await Promise.all(
			readdirSync(eventsRootFolder)
				.filter(
					(file) =>
						(file.endsWith(".ts") || file.endsWith(".js")) &&
						!file.endsWith(".d.ts"),
				)
				.map(async (file) => {
					const eventFile = join(eventsRootFolder, file);
					const Event = (await import(eventFile)).default;
					const eventObj = new Event();
					this.events.set(eventObj.eventName, {
						event: eventObj,
						type: eventObj.eventType,
					});
				}),
		);
		console.log("Events loaded");
	}

	listenEvent() {
		for (const event of this.events.values()) {
			this.echidna[event.type](event.event.eventName, async (...args) => {
				try {
					await event.event.run(...args);
				} catch (error) {
					console.error(`[EventManager] [${event.event.eventName}] `, error);
				}
			});
		}
	}
}
