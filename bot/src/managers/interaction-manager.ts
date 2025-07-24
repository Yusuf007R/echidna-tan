// merge of command, context menu, and modal manager

import config from "@Configs";
import InteractionLoader from "@Loaders/interaction-loader";
import {
	type Interaction,
	type MessageComponentInteraction,
	type ModalSubmitInteraction,
	REST,
	Routes,
} from "discord.js";
import { EventEmitter } from "tseep";
import CacheManager from "./cache-manager";

export default class InteractionManager {
	private interactionLoader: InteractionLoader;

	// Modal management
	private modalEventEmitter = new EventEmitter();

	private interactionEventEmitter = new EventEmitter();

	constructor() {
		this.interactionLoader = new InteractionLoader();
	}

	get commandsCount() {
		return this.interactionLoader.commandsCount;
	}

	get contextMenusCount() {
		return this.interactionLoader.contextMenusCount;
	}

	get commands() {
		return this.interactionLoader.getCommands();
	}

	get contextMenus() {
		return this.interactionLoader.getContextMenus();
	}

	async init() {
		await Promise.all([
			this.interactionLoader.loadInteractions("command"),
			this.interactionLoader.loadInteractions("contextMenu"),
		]);
		await this.registerInteractions();
	}

	async registerInteractions() {
		const interactionsToRegister =
			await this.interactionLoader.filterRegisteredInteractions();

		try {
			if (!interactionsToRegister) {
				console.log("No commands or updates to register.");
				return;
			}
			await new REST()
				.setToken(config.DISCORD_BOT_TOKEN)
				.put(Routes.applicationCommands(config.DISCORD_BOT_CLIENT_ID), {
					body: interactionsToRegister,
				});

			console.log(
				`Successfully registered ${interactionsToRegister.length} interactions.`,
			);
		} catch (error) {
			console.error("[InteractionManager] [registerInteractions]", error);
		}
	}

	/**
	 * Wait for interaction response (Modals, And Components like buttons and select)
	 */
	awaitInteractionResponse<Type extends "Modal" | "Component">(
		id: string,
		type: Type,
		timeout = CacheManager.TTL.oneMinute,
	): Promise<
		Type extends "Modal" ? ModalSubmitInteraction : MessageComponentInteraction
	> {
		const internalId = `${id}-${type}`;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error("Interaction response timed out"));
			}, timeout);
			this.interactionEventEmitter.once(internalId, (data) => {
				clearTimeout(timer);
				resolve(data);
			});
		});
	}

	private handleInteractionError(
		interaction: Interaction,
		error: unknown,
		type: "Command" | "ContextMenu" | "Autocomplete" | "Modal" | "Component",
		identifier: string,
	) {
		console.error(`[InteractionManager] [${type}] [${identifier}]`, error);

		if (type === "Modal") return;

		if (type === "Autocomplete") {
			if (interaction.channel && "send" in interaction.channel) {
				interaction.channel.send(
					"An error occured while executing the command.",
				);
			}
			return;
		}

		const errorMessage =
			type === "ContextMenu"
				? "An error occured while executing the context menu."
				: "An error occured while executing the command.";

		if ("replied" in interaction) {
			if (!interaction.replied) {
				interaction.reply({
					content: errorMessage,
					ephemeral: true,
				});
			} else {
				interaction.editReply(errorMessage);
			}
		}
	}

	async manageInteraction(interaction: Interaction) {
		if (interaction.isChatInputCommand()) {
			try {
				await this.commands
					.get(interaction.commandName)
					?.command._run(interaction);
			} catch (error) {
				this.handleInteractionError(
					interaction,
					error,
					"Command",
					interaction.commandName,
				);
			}
		}

		if (interaction.isContextMenuCommand()) {
			try {
				await this.contextMenus
					.get(interaction.commandName)
					?.contextMenu._run(interaction);
			} catch (error) {
				this.handleInteractionError(
					interaction,
					error,
					"ContextMenu",
					interaction.commandName,
				);
			}
		}

		if (interaction.isAutocomplete()) {
			try {
				await this.commands
					.get(interaction.commandName)
					?.command._handleAutocomplete(interaction);
			} catch (error) {
				this.handleInteractionError(
					interaction,
					error,
					"Autocomplete",
					interaction.commandName,
				);
			}
		}

		if (interaction.isModalSubmit()) {
			try {
				this.modalEventEmitter.emit(interaction.customId, interaction);
			} catch (error) {
				this.handleInteractionError(
					interaction,
					error,
					"Modal",
					interaction.customId,
				);
			}
		}

		if (interaction.isMessageComponent()) {
			try {
				this.interactionEventEmitter.emit(
					`${interaction.customId}-component`,
					interaction,
				);
			} catch (error) {
				this.handleInteractionError(
					interaction,
					error,
					"Component",
					interaction.customId,
				);
			}
		}
	}
}
