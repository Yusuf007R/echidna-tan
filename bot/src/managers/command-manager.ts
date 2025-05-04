import { readdirSync } from "node:fs";
import { join } from "node:path";
import configs from "@Configs";
import type { CmdType, Command } from "@Structures/command";
import type { Option } from "@Utils/options-builder";
import {
	SlashCommandBuilder,
	type SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import {
	type AutocompleteInteraction,
	type CacheType,
	Collection,
	type CommandInteraction,
	InteractionContextType,
	REST,
	type RESTPostAPIApplicationCommandsJSONBody,
	Routes,
} from "discord.js";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import db, { buildConflictUpdateColumns } from "src/drizzle";
import { commandsTable } from "src/drizzle/schema";

import { createHash } from "node:crypto";
import config from "@Configs";
import type { InferInsertModel } from "drizzle-orm";
import stringify from "safe-stable-stringify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MapCmds = {
	command: RESTPostAPIApplicationCommandsJSONBody;
	hash: string;
	category: string;
	cmdType: CmdType;
	description: string;
};
export default class CommandManager {
	commands: Collection<string, { category: string; command: Command }>;

	constructor() {
		this.commands = new Collection<
			string,
			{ category: string; command: Command }
		>();
	}

	async loadCommands() {
		const commandsRootFolder = join(__dirname, "/commands");
		const commands: { [key: string]: Command[] } = {};
		const checkDupName = new Map<string, true>();
		await Promise.all(
			readdirSync(commandsRootFolder).flatMap(async (folder) => {
				const commandFolder = join(commandsRootFolder, folder);
				await Promise.all(
					readdirSync(commandFolder)
						.filter(
							(file) =>
								!RegExp(/\[.*\]/gm).test(file) &&
								(file.endsWith(".ts") || file.endsWith(".js")) &&
								!file.endsWith(".d.ts"),
						)
						.map(async (file) => {
							const commandFile = join(commandFolder, file);
							const Command = (await import(commandFile)).default;
							const cmdObj = new Command();
							if (checkDupName.has(cmdObj.name)) {
								throw new Error(
									`Duplicate command name: ${cmdObj.name} in ${commandFolder}`,
								);
							}
							checkDupName.set(cmdObj.name, true);
							if (!commands[commandFolder]) commands[commandFolder] = [];
							commands[commandFolder].push(cmdObj);
						}),
				);
			}),
		);

		for (const key in commands) {
			const command = commands[key];
			for (const cmd of command) {
				this.commands.set(cmd.name, {
					category: key.split("/").pop() ?? "",
					command: cmd,
				});
			}
		}

		console.log("Commands loaded");
	}

	async filterRegisteredCommands() {
		const slashCommmands = this.mapCommands();

		const registeredCommandsDB = await db.query.commandsTable.findMany();
		let shouldUpdateCommands = false;

		const commandToRegister: MapCmds[] = [];

		const registeredCommands: {
			command: MapCmds;
			dbCommmand: (typeof registeredCommandsDB)[number];
		}[] = [];

		const insertDb: InferInsertModel<typeof commandsTable>[] = [];

		for (const cmd of slashCommmands) {
			const registeredCmd = registeredCommandsDB.find(
				(registeredCmd) => registeredCmd.name === cmd.command.name,
			);

			if (
				!registeredCmd ||
				registeredCmd.hash !== cmd.hash ||
				config.NODE_ENV === "production"
			) {
				if (config.NODE_ENV !== "production") {
					registeredCmd
						? console.log(`${registeredCmd.name} - changed`)
						: console.log(`${cmd.command.name} - new command`);
				}

				shouldUpdateCommands = true;
				const insert: InferInsertModel<typeof commandsTable> = {
					name: cmd.command.name,
					hash: cmd.hash,
					category: cmd.category,
					description: cmd.description,
					cmdType: cmd.cmdType,
				};
				commandToRegister.push(cmd);
				insertDb.push(insert);
			} else {
				registeredCommands.push({ command: cmd, dbCommmand: registeredCmd });
			}
		}

		if (insertDb.length) {
			await db
				.insert(commandsTable)
				.values(insertDb)
				.onConflictDoUpdate({
					target: commandsTable.name,
					set: buildConflictUpdateColumns(commandsTable, [
						"hash",
						"category",
						"description",
						"cmdType",
					]),
				});
		}

		return shouldUpdateCommands
			? slashCommmands.map((cmd) => cmd.command)
			: null;
	}

	async registerCommands() {
		const commandToRegister = await this.filterRegisteredCommands();

		try {
			if (!commandToRegister) {
				console.log("No commands or updates to register.");
				return;
			}
			await new REST()
				.setToken(configs.DISCORD_BOT_TOKEN)
				.put(Routes.applicationCommands(configs.DISCORD_BOT_CLIENT_ID), {
					body: commandToRegister,
				});

			console.log(
				`Successfully registered ${commandToRegister.length} commands.`,
			);
		} catch (error) {
			// ! IF ERROR GO NUCLEAR AND DELETE ALL COMMANDS IN DB
			await db.delete(commandsTable);
			console.error(error);
		}
	}

	getCmd(
		interaction:
			| CommandInteraction<CacheType>
			| AutocompleteInteraction<CacheType>,
	) {
		const cmd = this.commands.get(interaction.commandName);
		if (!cmd) {
			throw new Error(`Cmd not found ${interaction.commandName}`);
		}
		return cmd;
	}

	async executeCommand(interaction: CommandInteraction<CacheType>) {
		try {
			const cmd = this.getCmd(interaction);
			await cmd.command._run(interaction);
		} catch (error) {
			console.log(`[CommandManager] [${interaction.commandName}] ${error}`);
			interaction.editReply("An error occured while executing the command.");
		}
	}

	async executeAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
		try {
			const cmd = this.getCmd(interaction);
			await cmd.command._handleAutocomplete(interaction);
		} catch (error) {
			console.log(error);
			if (interaction.inGuild() && interaction.channel?.isTextBased())
				interaction?.channel?.send(
					"An error occured while executing the command autocomplete.",
				);
		}
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
				this.optionBuilder(command._optionsArray as any, slash);
			}

			const json = slash.toJSON();
			const stableJson = stringify(json);
			const hash = createHash("md5").update(stableJson).digest("hex");
			return {
				command: slash.toJSON(),
				hash,
				cmdType: command.cmdType,
				category,
				description: command.description,
			};
		});
	}

	async optionBuilder(
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
						if (element.options) this.optionBuilder(element.options, option);
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
}
