import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import config from "@Configs";
import type ContextMenu from "@Structures/context-menu";
import EchidnaSingleton from "@Structures/echidna-singleton";
import {
	Collection,
	ContextMenuCommandBuilder,
	type ContextMenuCommandInteraction,
	REST,
	Routes,
} from "discord.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class ContextMenuManager extends EchidnaSingleton {
	contextMenu: Collection<
		string,
		{ category: string; contextMenu: ContextMenu }
	>;

	constructor() {
		super();
		this.contextMenu = new Collection<
			string,
			{ category: string; contextMenu: ContextMenu }
		>();
	}

	async init() {
		await this.loadContextMenus();
		await this.registerContextMenus();
	}

	async executeContextMenu(interaction: ContextMenuCommandInteraction) {
		const contextMenu = this.contextMenu.get(interaction.commandName);
		if (!contextMenu) return;
		await contextMenu.contextMenu._run(interaction);
	}

	async loadContextMenus() {
		const contextMenuRootFolder = join(__dirname, "/context-menu");
		const contextMenus: { [key: string]: ContextMenu[] } = {};
		await Promise.all(
			readdirSync(contextMenuRootFolder).flatMap(async (folder) => {
				const contextMenuFolder = join(contextMenuRootFolder, folder);
				await Promise.all(
					readdirSync(contextMenuFolder)
						.filter(
							(file) =>
								!RegExp(/\[.*\]/gm).test(file) &&
								(file.endsWith(".ts") || file.endsWith(".js")) &&
								!file.endsWith(".d.ts"),
						)
						.map(async (file) => {
							const contextMenuFile = join(contextMenuFolder, file);
							const ContextMenu = (await import(contextMenuFile)).default;
							const contextMenuObj = new ContextMenu();
							if (!contextMenus[contextMenuFolder])
								contextMenus[contextMenuFolder] = [];
							contextMenus[contextMenuFolder].push(contextMenuObj);
						}),
				);
			}),
		);

		for (const key in contextMenus) {
			const contextMenu = contextMenus[key];
			for (const cmd of contextMenu) {
				this.contextMenu.set(cmd.name, {
					category: key.split("/").pop() ?? "",
					contextMenu: cmd,
				});
			}
		}
		console.log("Context menus loaded");
	}

	async registerContextMenus() {
		const guilds = await EchidnaSingleton.echidna.guildsManager.getGuilds();
		const contextMenuArr = this.contextMenu.map((contextMenu) => {
			return new ContextMenuCommandBuilder()
				.setName(contextMenu.contextMenu.name)
				.setType(contextMenu.contextMenu.type === "USER" ? 2 : 3);
		});

		const request = guilds.map((guild) => {
			return new REST()
				.setToken(config.DISCORD_TOKEN)
				.put(
					Routes.applicationGuildCommands(
						config.DISCORD_BOT_CLIENT_ID,
						guild.guild.id,
					),
					{
						body: contextMenuArr,
					},
				);
		});

		await Promise.all(request);

		console.log("Successfully registered context menus");
	}
}
