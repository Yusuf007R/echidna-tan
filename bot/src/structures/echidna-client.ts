import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";

import { startServer } from "@Api/index";
import { default as config, default as configs } from "@Configs";
import CommandManager from "@Managers/command-manager";
import ContextMenuManager from "@Managers/context-menu-manager";
import EventManager from "@Managers/event-manager";
import GuildsManager from "@Managers/guilds-manager";
import ModalManager from "@Managers/modal-manager";
import EchidnaSingleton from "@Structures/echidna-singleton";
import MusicPlayer from "@Structures/music-player";
import type TicTacToe from "@Structures/tic-tac-toe";
import { eq } from "drizzle-orm";
import db, { initDB } from "src/drizzle";
import { echidnaTable } from "src/drizzle/schema";

export default class EchidnaClient extends Client {
	clientSingleton = new EchidnaSingleton(this);

	musicPlayer = new MusicPlayer(this);

	ticTacToeManager = new Collection<string, TicTacToe>();

	commandManager = new CommandManager();

	eventManager = new EventManager();

	guildsManager = new GuildsManager();

	contextMenuManager = new ContextMenuManager();

	modalManager = new ModalManager();

	api = startServer();

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
		this.init();
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
		this.eventManager.init();

		await initDB();

		await this.login(configs.DISCORD_BOT_TOKEN);
	}
}
