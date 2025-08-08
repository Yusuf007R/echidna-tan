import { default as config, default as configs } from "@Configs";
import db, { initDB } from "@Drizzle/db";
import { echidnaTable } from "@Drizzle/schema";
import EventManager from "@Managers/event-manager";
import GuildsManager from "@Managers/guilds-manager";
import InteractionManager from "@Managers/interaction-manager";
import EchidnaSingleton from "@Structures/echidna-singleton";
import MusicPlayer from "@Structures/music-player";
import type TicTacToe from "@Structures/tic-tac-toe";
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { eq } from "drizzle-orm";

export default class EchidnaClient extends Client {
	clientSingleton = new EchidnaSingleton(this);

	musicPlayer = new MusicPlayer(this);

	ticTacToeManager = new Collection<string, TicTacToe>();

	eventManager = new EventManager();

	guildsManager = new GuildsManager();

	interactionManager = new InteractionManager();

	// api = startServer();

	constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildVoiceStates,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMessageReactions,
				GatewayIntentBits.DirectMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.GuildMembers,
			],
			partials: [
				Partials.Channel,
				Partials.Message,
				Partials.Channel,
				Partials.Reaction,
				Partials.User,
			],
		});
		void this.init();
	}

	async updateEchidna() {
		let echidna = await db.query.echidnaTable.findFirst({
			where: eq(echidnaTable.id, config.DISCORD_DB_PROFILE),
		});

		if (!echidna) {
			const [dbEchidna] = await db
				.insert(echidnaTable)
				.values({
					id: config.DISCORD_DB_PROFILE,
				})
				.returning();

			if (!dbEchidna) {
				throw new Error("Echidna not found");
			}
			echidna = dbEchidna;
		}

		this.user?.setPresence({
			status: echidna.status,
			activities: [
				{
					name: echidna.activity,
					type: echidna.activityType,
					state: echidna.state ?? undefined,
				},
			],
		});
	}

	async init() {
		console.log("[EchidnaClient] initializing");
		await this.eventManager.init();
		await this.musicPlayer.init();
		await initDB();

		await this.login(configs.DISCORD_BOT_TOKEN);
	}
}
