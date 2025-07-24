import type { CmdType, Command } from "@Structures/command";
import type ContextMenu from "@Structures/context-menu";
import { getBaseDir } from "@Utils/get-dir-name";
import type { Option } from "@Utils/options-builder";
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	Collection,
	ContextMenuCommandBuilder,
	InteractionContextType,
	type RESTPostAPIApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
	SlashCommandBuilder,
	type SlashCommandSubcommandBuilder,
} from "discord.js";
import { type InferInsertModel, inArray } from "drizzle-orm";
import stringify from "safe-stable-stringify";
import db, { buildConflictUpdateColumns } from "src/drizzle";
import { commandsTable, contextMenusTable } from "src/drizzle/schema";

type MapCmds = {
	command: RESTPostAPIApplicationCommandsJSONBody;
	hash: string;
	category: string;
	cmdType: CmdType;
	description: string;
};

type MapContextMenus = {
	contextMenu: RESTPostAPIContextMenuApplicationCommandsJSONBody;
	hash: string;
	category: string;
	description: string;
	type: "USER" | "MESSAGE";
	cmdType: CmdType;
};

export default class InteractionLoader {
	private commands: Collection<string, { category: string; command: Command }>;
	private contextMenus: Collection<
		string,
		{ category: string; contextMenu: ContextMenu<"USER" | "MESSAGE"> }
	>;

	constructor() {
		this.commands = new Collection();
		this.contextMenus = new Collection();
	}

	get commandsCount() {
		return this.commands.size;
	}

	get contextMenusCount() {
		return this.contextMenus.size;
	}

	getCommands() {
		return this.commands;
	}

	getContextMenus() {
		return this.contextMenus;
	}

	async loadInteractions<T extends "command" | "contextMenu">(type: T) {
		const interactionsRootFolder = join(
			getBaseDir(),
			type === "command" ? "/commands" : "/context-menu",
		);

		const interactions: {
			[key: string]: {
				category: string;
				interaction: Command | ContextMenu<"USER" | "MESSAGE">;
			};
		} = {};
		const checkDupName = new Map<string, true>();

		await Promise.all(
			readdirSync(interactionsRootFolder).flatMap(async (folder) => {
				const interactionFolder = join(interactionsRootFolder, folder);
				await Promise.all(
					readdirSync(interactionFolder)
						.filter(
							(file) =>
								!RegExp(/\[.*\]/gm).test(file) &&
								(file.endsWith(".ts") || file.endsWith(".js")) &&
								!file.endsWith(".d.ts"),
						)
						.map(async (file) => {
							try {
								const interactionFile = join(interactionFolder, file);
								const Interaction = (await import(interactionFile)).default;
								const interactionObj = new Interaction();
								if (checkDupName.has(interactionObj.name)) {
									throw new Error(
										`Duplicate interaction name: ${interactionObj.name} in ${interactionFolder}`,
									);
								}
								checkDupName.set(interactionObj.name, true);
								interactions[interactionObj.name] = {
									category: folder,
									interaction: interactionObj,
								};
							} catch (error) {
								if (
									error instanceof Error &&
									error.message.includes("Duplicate interaction name")
								) {
									throw error;
								}
								console.error(
									`[InteractionLoader] [loadInteractions] [${type}]`,
									error,
								);
							}
						}),
				);
			}),
		);

		for (const key in interactions) {
			const interaction = interactions[key];
			if (type === "command") {
				this.commands.set(interaction.interaction.name, {
					category: interaction.category,
					command: interaction.interaction as Command,
				});
			} else if (type === "contextMenu") {
				this.contextMenus.set(interaction.interaction.name, {
					category: interaction.category,
					contextMenu: interaction.interaction as ContextMenu<
						"USER" | "MESSAGE"
					>,
				});
			}
		}
		console.log(`[InteractionLoader] [${type}] loaded`);
	}

	async filterRegisteredInteractions() {
		const commands = this.mapCommands();
		const contextMenus = this.mapContextMenus();

		let [registeredCommands, registeredContextMenus] = await Promise.all([
			db.query.commandsTable.findMany(),
			db.query.contextMenusTable.findMany(),
		]);

		const insertDbCommands: InferInsertModel<typeof commandsTable>[] = [];
		const insertDbContextMenus: InferInsertModel<typeof contextMenusTable>[] =
			[];

		let shouldUpdate = false;

		for (const cmd of commands) {
			const registeredCmd = registeredCommands.find(
				(registeredCmd) => registeredCmd.name === cmd.command.name,
			);

			registeredCommands = registeredCommands.filter(
				(cmd) => cmd.name !== registeredCmd?.name,
			);

			if (!registeredCmd || registeredCmd.hash !== cmd.hash) {
				registeredCmd
					? console.log(`${registeredCmd.name} - changed`)
					: console.log(`${cmd.command.name} - new command`);

				shouldUpdate = true;
				const insert: InferInsertModel<typeof commandsTable> = {
					name: cmd.command.name,
					hash: cmd.hash,
					category: cmd.category,
					description: cmd.description,
					cmdType: cmd.cmdType,
				};
				insertDbCommands.push(insert);
			}
		}

		for (const contextMenu of contextMenus) {
			const registeredContextMenu = registeredContextMenus.find(
				(registeredContextMenu) =>
					registeredContextMenu.name === contextMenu.contextMenu.name,
			);

			registeredContextMenus = registeredContextMenus.filter(
				(contextMenu) => contextMenu.name !== registeredContextMenu?.name,
			);

			if (
				!registeredContextMenu ||
				registeredContextMenu.hash !== contextMenu.hash
			) {
				registeredContextMenu
					? console.log(`${registeredContextMenu.name} - changed`)
					: console.log(`${contextMenu.contextMenu.name} - new context menu`);

				shouldUpdate = true;
				const insert: InferInsertModel<typeof contextMenusTable> = {
					name: contextMenu.contextMenu.name,
					hash: contextMenu.hash,
					category: contextMenu.category,
					description: contextMenu.description,
					type: contextMenu.type,
					cmdType: contextMenu.cmdType,
				};
				insertDbContextMenus.push(insert);
			}
		}

		const promises = [
			registeredCommands.length &&
				db
					.update(commandsTable)
					.set({ deletedAt: new Date() })
					.where(
						inArray(
							commandsTable.name,
							registeredCommands.map((cmd) => cmd.name),
						),
					),
			registeredContextMenus.length &&
				db
					.update(contextMenusTable)
					.set({ deletedAt: new Date() })
					.where(
						inArray(
							contextMenusTable.name,
							registeredContextMenus.map((cmd) => cmd.name),
						),
					),
			insertDbCommands.length &&
				db
					.insert(commandsTable)
					.values(insertDbCommands)
					.onConflictDoUpdate({
						target: commandsTable.name,
						set: buildConflictUpdateColumns(commandsTable, [
							"hash",
							"category",
							"description",
							"cmdType",
						]),
					}),
			insertDbContextMenus.length &&
				db
					.insert(contextMenusTable)
					.values(insertDbContextMenus)
					.onConflictDoUpdate({
						target: contextMenusTable.name,
						set: buildConflictUpdateColumns(contextMenusTable, [
							"hash",
							"category",
							"type",
							"cmdType",
						]),
					}),
		];

		const filteredPromises = promises.filter((x) => typeof x !== "number");

		await Promise.all(filteredPromises);

		return shouldUpdate
			? [
					...commands.map((cmd) => cmd.command),
					...contextMenus.map((cmd) => cmd.contextMenu),
				]
			: null;
	}

	mapCommands(): MapCmds[] {
		return this.commands.map(({ command, category }) => {
			const contexts = {
				BOTH: [InteractionContextType.Guild, InteractionContextType.BotDM],
				GUILD: [InteractionContextType.Guild],
				DM: [InteractionContextType.BotDM],
			}[command.cmdType];

			const slash = new SlashCommandBuilder()
				.setName(command.name)
				.setDescription(command.description)
				.setContexts(...contexts);

			if ((command._optionsArray as any)?.length) {
				this.commandOptionsBuilder(command._optionsArray as any, slash);
			}

			const json = slash.toJSON();

			const basedObject = {
				command: json,
				cmdType: command.cmdType,
				category,
				description: command.description,
			};

			const hash = this.hashGenerator(basedObject);

			return {
				...basedObject,
				hash,
			};
		});
	}

	mapContextMenus(): MapContextMenus[] {
		return this.contextMenus.map(({ contextMenu, category }) => {
			const builder = new ContextMenuCommandBuilder()
				.setName(contextMenu.name)
				.setType(contextMenu.type === "USER" ? 2 : 3);

			const json = builder.toJSON();

			const basedObject = {
				contextMenu: json,
				category,
				description: contextMenu.description,
				cmdType: contextMenu.cmdType,
				type: contextMenu.type,
			};

			const hash = this.hashGenerator(basedObject);

			return {
				...basedObject,
				hash,
			};
		});
	}

	commandOptionsBuilder(
		options: Option[],
		slash: SlashCommandBuilder | SlashCommandSubcommandBuilder,
	) {
		for (const element of options) {
			switch (element.type) {
				case "string":
					slash.addStringOption((option) => {
						option.setName(element.name).setDescription(element.description);
						if (element.required) option.setRequired(true);
						if (element.choices?.length) {
							option.addChoices(
								...element.choices.map((e) => ({ name: e, value: e })),
							);
						}

						if (element.autocomplete) option.setAutocomplete(true);
						return option;
					});
					break;
				case "user":
					slash.addUserOption((option) => {
						option.setName(element.name).setDescription(element.description);
						if (element.required) option.setRequired(true);
						return option;
					});
					break;
				case "int":
					slash.addIntegerOption((option) => {
						option.setName(element.name).setDescription(element.description);
						if (element.required) option.setRequired(true);
						if (element.min) option.setMinValue(element.min);
						if (element.max) option.setMaxValue(element.max);
						return option;
					});
					break;
				case "sub-command":
					if (!(slash instanceof SlashCommandBuilder)) return;
					slash.addSubcommand((option) => {
						option.setName(element.name).setDescription(element.description);
						if (element.options)
							this.commandOptionsBuilder(element.options, option);
						return option;
					});
					break;
				case "bool":
					slash.addBooleanOption((option) => {
						option.setName(element.name).setDescription(element.description);
						if (element.required) option.setRequired(true);
						return option;
					});
					break;
				case "attachment":
					slash.addAttachmentOption((option) => {
						option.setName(element.name).setDescription(element.description);
						if (element.required) option.setRequired(true);
						return option;
					});
					break;
				default:
					break;
			}
		}
	}

	private hashGenerator(json: Record<string, unknown>) {
		const stableJson = stringify(json);
		return createHash("md5").update(stableJson).digest("hex");
	}
}
