import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import config from "@Configs";
import type { CmdType } from "@Structures/command";
import type ContextMenu from "@Structures/context-menu";
import EchidnaSingleton from "@Structures/echidna-singleton";
import {
	Collection,
	ContextMenuCommandBuilder,
	type ContextMenuCommandInteraction,
	REST,
	Routes,
} from "discord.js";
import { type InferInsertModel, inArray } from "drizzle-orm";
import stringify from "safe-stable-stringify";
import db, { buildConflictUpdateColumns } from "src/drizzle";
import { contextMenusTable } from "src/drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MapContextMenus = {
	command: ReturnType<ContextMenuCommandBuilder["toJSON"]>;
	hash: string;
	category: string;
	type: "USER" | "MESSAGE";
	cmdType: CmdType;
	description: string;
};

export default class ContextMenuManager extends EchidnaSingleton {
	contextMenu: Collection<
		string,
		{ category: string; contextMenu: ContextMenu<"USER" | "MESSAGE"> }
	>;

	constructor() {
		super();
		this.contextMenu = new Collection<
			string,
			{ category: string; contextMenu: ContextMenu<"USER" | "MESSAGE"> }
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
		const contextMenus: { [key: string]: ContextMenu<"USER" | "MESSAGE">[] } =
			{};
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
							try {
								const contextMenuFile = join(contextMenuFolder, file);
								const ContextMenu = (await import(contextMenuFile)).default;
								const contextMenuObj = new ContextMenu();
								if (!contextMenus[contextMenuFolder])
									contextMenus[contextMenuFolder] = [];
								contextMenus[contextMenuFolder].push(contextMenuObj);
							} catch (error) {
								if (
									error instanceof Error &&
									error.message.includes("Duplicate command name")
								)
									throw error;
								console.error("[ContextMenuManager] [loadContextMenus]", error);
							}
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

	mapContextMenus(): MapContextMenus[] {
		return this.contextMenu.map(({ contextMenu, category }) => {
			const builder = new ContextMenuCommandBuilder()
				.setName(contextMenu.name)
				.setType(contextMenu.type === "USER" ? 2 : 3);

			const json = builder.toJSON();
			const stableJson = stringify(json);
			const hash = createHash("md5").update(stableJson).digest("hex");

			return {
				command: json,
				hash,
				category,
				cmdType: contextMenu.cmdType,
				type: contextMenu.type,
				description: contextMenu.description,
			};
		});
	}

	async filterRegisteredContextMenus() {
		const contextMenus = this.mapContextMenus();
		let registeredContextMenusDB = await db.query.contextMenusTable.findMany();
		let shouldUpdateContextMenus = false;

		const insertDb: InferInsertModel<typeof contextMenusTable>[] = [];

		for (const contextMenu of contextMenus) {
			const registeredContextMenu = registeredContextMenusDB.find(
				(registered) => registered.name === contextMenu.command.name,
			);

			registeredContextMenusDB = registeredContextMenusDB.filter(
				(cmd) => cmd.name !== registeredContextMenu?.name,
			);

			if (
				!registeredContextMenu ||
				registeredContextMenu.hash !== contextMenu.hash
			) {
				registeredContextMenu
					? console.log(`${registeredContextMenu.name} - changed`)
					: console.log(`${contextMenu.command.name} - new context menu`);

				shouldUpdateContextMenus = true;
				const insert: InferInsertModel<typeof contextMenusTable> = {
					name: contextMenu.command.name,
					hash: contextMenu.hash,
					category: contextMenu.category,
					type: contextMenu.type,
					cmdType: contextMenu.cmdType,
					description: contextMenu.description,
				};
				insertDb.push(insert);
			}
		}

		if (registeredContextMenusDB.length) {
			await db
				.update(contextMenusTable)
				.set({
					deletedAt: new Date(),
				})
				.where(
					inArray(
						contextMenusTable.name,
						registeredContextMenusDB.map((cmd) => cmd.name),
					),
				);
		}

		if (insertDb.length) {
			await db
				.insert(contextMenusTable)
				.values(insertDb)
				.onConflictDoUpdate({
					target: contextMenusTable.name,
					set: buildConflictUpdateColumns(contextMenusTable, [
						"hash",
						"category",
						"type",
					]),
				});
		}

		return shouldUpdateContextMenus
			? contextMenus.map((cmd) => cmd.command)
			: null;
	}

	async registerContextMenus() {
		const contextMenusToRegister = await this.filterRegisteredContextMenus();

		try {
			if (!contextMenusToRegister) {
				console.log("No context menus or updates to register.");
				return;
			}

			await new REST()
				.setToken(config.DISCORD_BOT_TOKEN)
				.put(Routes.applicationCommands(config.DISCORD_BOT_CLIENT_ID), {
					body: contextMenusToRegister,
				});

			console.log(
				`Successfully registered ${contextMenusToRegister.length} context menus.`,
			);
		} catch (error) {
			console.error("[ContextMenuManager] [registerContextMenus]", error);
		}
	}
}
