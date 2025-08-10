import { AsyncLocalStorage } from "node:async_hooks";

import {
	BaseInteraction,
	// Components v2 builders for detection
	ContainerBuilder,
	FileBuilder,
	MediaGalleryBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	type BaseMessageOptions,
	type CacheType,
	type Channel,
	type Interaction,
	type InteractionReplyOptions,
	type Message,
	type ModalBuilder,
	type ModalSubmitInteraction,
	type User,
} from "discord.js";
import EchidnaSingleton from "./echidna-singleton";

/**
 * Extended message options that includes ephemeral flag for our internal processing
 */
export type ExtendedMessageOptions = BaseMessageOptions & {
	ephemeral?: boolean;
	flags?: number;
};

export type ReplyMessage = {
	id: string;
	edit: (options: string | ExtendedMessageOptions) => Promise<void>;
	delete: () => Promise<void>;
	followUp: (options: string | ExtendedMessageOptions) => Promise<ReplyMessage>;
};

/**
 * Context type that represents either an interaction or message context
 */
type InteractionContextType =
	| {
			type: "interaction";
			interaction: BaseInteraction<CacheType>;
	  }
	| {
			type: "message";
			message: Message;
	  };

/**
 * Async local storage for maintaining context throughout the request lifecycle
 */
const storage = new AsyncLocalStorage<InteractionContextType>();

/**
 * Options for sending messages with embeds, files, and ephemeral settings
 */

/**
 * Universal wrapper around interactions and messages for consistent API across the bot.
 * Handles defer system, reply, send, edit, embeds - abstracts away the complexity of
 * different interaction types and provides fallback mechanisms.
 *
 * Features:
 * - Automatic defer handling
 * - Smart reply/editReply/followUp routing
 * - Message vs Interaction abstraction
 * - Channel validation and error handling
 * - Async local storage for context passing
 */
export class InteractionContext {
	/**
	 * Gets the user from the current context (interaction user or message author)
	 * @returns The user associated with the current context
	 * @throws Error if not called within InteractionContext.run() or no user is found
	 */
	static get user(): User {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction") return context.interaction.user;
		if (context.type === "message") return context.message.author;
		throw new Error("User not found");
	}

	/**
	 * Gets the channel from the current context
	 * @returns The channel from interaction or message
	 * @throws Error if no channel is found
	 */
	static get channel(): Channel {
		return InteractionContext.getChannel();
	}

	/**
	 * Gets the text-based channel from the current context
	 * @returns The text-based channel with send capability
	 * @throws Error if channel is not found or not text-based
	 */
	static get textBasedChannel() {
		return InteractionContext.getTextBasedChannel();
	}

	/**
	 * Gets the interaction from the current context
	 * @returns The interaction if context is an interaction, null otherwise
	 * @throws Error if not called within InteractionContext.run()
	 */
	static get interaction() {
		return InteractionContext.getInteraction();
	}

	/**
	 * Gets the message from the current context
	 * @returns The message if context is a message, null otherwise
	 * @throws Error if not called within InteractionContext.run()
	 */
	static get message() {
		return InteractionContext.getMessage();
	}

	/**
	 * Gets the guild from the current context
	 * @returns The guild if context is an interaction or message, null otherwise
	 * @throws Error if not called within InteractionContext.run()
	 */
	static get guild() {
		return InteractionContext.getGuild();
	}

	/**
	 * Private method to send a reply to the current context
	 * Sends or edits a reply to the current context (interaction or message)
	 * @param options - Message content or options object
	 * @param allowedEdit - Whether to allow editing the reply
	 * @returns A reply message object with edit, delete, and followUp methods
	 * @throws Error if not called within InteractionContext.run()
	 */
	private static async _sendReply(
		options: string | ExtendedMessageOptions,
		allowedEdit = false,
	): Promise<ReplyMessage> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (interaction.isRepliable()) {
				if (interaction.deferred || (interaction.replied && allowedEdit)) {
					// For edits, ephemeral is not allowed
					const processedOptions = InteractionContext.processMessageOptions(
						options,
						false,
					);
					const edit = await interaction.editReply(processedOptions);
					return InteractionContext.messageToReplyMessage(edit);
				}
				if (!interaction.replied && !interaction.deferred) {
					// For initial replies, ephemeral is allowed
					const processedOptions = InteractionContext.processMessageOptions(
						options,
						true,
					);

					// First send the reply without fetchReply
					await interaction.reply(processedOptions as InteractionReplyOptions);

					// Then fetch the reply to get the message object
					const message = await interaction.fetchReply();
					return InteractionContext.messageToReplyMessage(message);
				}
			}
		} else {
			// For message context, ephemeral is not supported
			const processedOptions = InteractionContext.processMessageOptions(
				options,
				false,
			);

			if (allowedEdit) {
				const edit = await context.message.edit(processedOptions);
				return InteractionContext.messageToReplyMessage(edit);
			}
			const reply = await context.message.reply(processedOptions);
			return InteractionContext.messageToReplyMessage(reply);
		}

		// Fallback for non-repliable or no replyMessage
		return await InteractionContext.sendInChannel(options);
	}

	/**
	 * Sends or edits a reply to the current context (interaction or message)
	 * @param options - Message content or options object
	 * @param allowedEdit - Whether to allow editing the reply
	 * @returns A reply message object with edit, delete, and followUp methods
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async sendReply(
		options: string | ExtendedMessageOptions,
	): Promise<void> {
		await InteractionContext._sendReply(options);
	}

	/**
	 * Edits the reply message in the current context (interaction or message)
	 * @param options - Message content or options object to edit the reply with
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async editReply(
		options: string | ExtendedMessageOptions,
	): Promise<void> {
		await InteractionContext._sendReply(options, true);
	}

	/**
	 * Deletes the reply message in the current context
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async deleteReply(): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (!interaction.isRepliable()) return;
			if (!interaction.deferred && !interaction.replied) return;
			await interaction.deleteReply();
			return;
		}
		await context.message.delete();
		return;
	}

	/**
	 * Defers the reply for interactions (no-op for messages)
	 * Only defers if the interaction is repliable and not already replied/deferred
	 * @param options - Optional ephemeral setting for the deferred reply
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async deferReply(options?: { ephemeral?: boolean }): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (
				interaction.isRepliable() &&
				!interaction.replied &&
				!interaction.deferred
			) {
				await interaction.deferReply(options);
			}
		}
		// Messages don't need to be deferred
	}

	/**
	 * Defers an update for message component interactions
	 * Only works with message component interactions that haven't been replied/deferred
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async deferUpdate(): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (
				interaction.isMessageComponent() &&
				!interaction.replied &&
				!interaction.deferred
			) {
				await interaction.deferUpdate();
			}
		}
	}

	/**
	 * Shows a modal dialog to the user
	 * Only works with interactions (throws error for message contexts)
	 * @param modal - The modal builder to display
	 * @returns Promise that resolves with the modal submit interaction
	 * @throws Error if not called within InteractionContext.run(), called in message context, or unsupported interaction type
	 */
	static async showModal(modal: ModalBuilder): Promise<ModalSubmitInteraction> {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "message")
			throw new Error("Modal can only be shown in interactions");

		const interaction = context.interaction;
		if (
			!(
				interaction.isChatInputCommand() ||
				interaction.isContextMenuCommand() ||
				interaction.isMessageComponent()
			)
		)
			throw new Error("Modal can only be shown in interactions");

		await interaction.showModal(modal);
		console.log("Modal shown");
		const res =
			await EchidnaSingleton.echidna.interactionManager.awaitInteractionResponse(
				modal.data.custom_id!,
				"Modal",
			);
		console.log("Modal response received");

		return res;
	}

	/**
	 * Sends a message directly to the channel (not as a reply)
	 * @param options - Message content or create options
	 * @returns Promise that resolves with the sent message
	 * @throws Error if not called within InteractionContext.run() or channel is not text-based
	 */
	static async sendInChannel(
		options: string | ExtendedMessageOptions,
	): Promise<ReplyMessage> {
		const channel = InteractionContext.getTextBasedChannel();
		if (!channel) throw new Error("Channel not found or not text-based");

		// Process options for Components v2 but no ephemeral (not supported in channel messages)
		const processedOptions = InteractionContext.processMessageOptions(
			options,
			false,
		);
		const message = await channel.send(processedOptions);
		return InteractionContext.messageToReplyMessage(message);
	}

	/**
	 * Checks if the current context is an interaction
	 * @returns True if context is an interaction, false if it's a message
	 * @throws Error if not called within InteractionContext.run()
	 */
	static isInteraction(): boolean {
		const context = InteractionContext.getInteractionContext();
		return context.type === "interaction";
	}

	/**
	 * Checks if the current context is a message
	 * @returns True if context is a message, false if it's an interaction
	 * @throws Error if not called within InteractionContext.run()
	 */
	static isMessage(): boolean {
		const context = InteractionContext.getInteractionContext();
		return context.type === "message";
	}

	/**
	 * Gets the interaction from the current context
	 * @returns The interaction if context is an interaction, null otherwise
	 * @throws Error if not called within InteractionContext.run()
	 */
	static getInteraction(): BaseInteraction<CacheType> | null {
		const context = InteractionContext.getInteractionContext();
		return context.type === "interaction" ? context.interaction : null;
	}

	/**
	 * Gets the message from the current context
	 * @returns The message if context is a message, null otherwise
	 * @throws Error if not called within InteractionContext.run()
	 */
	static getMessage(): Message | null {
		const context = InteractionContext.getInteractionContext();
		return context.type === "message" ? context.message : null;
	}

	/**
	 * Checks if the interaction has already been replied to
	 * @returns True if interaction is replied, false for messages or unreplied interactions
	 * @throws Error if not called within InteractionContext.run()
	 */
	static isReplied(): boolean {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction" && context.interaction.isRepliable()) {
			return context.interaction.replied;
		}
		return false;
	}

	/**
	 * Checks if the interaction has been deferred
	 * @returns True if interaction is deferred, false for messages or non-deferred interactions
	 * @throws Error if not called within InteractionContext.run()
	 */
	static isDeferred(): boolean {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction" && context.interaction.isRepliable()) {
			return context.interaction.deferred;
		}
		return false;
	}

	/**
	 * Runs a callback within the context of an interaction or message
	 * Sets up async local storage for the duration of the callback
	 * @param context - The interaction or message to use as context
	 * @param callback - The async function to execute within the context
	 * @returns Promise that resolves with the callback's return value
	 */
	static run<T>(
		context: Interaction | Message,
		callback: () => Promise<T>,
	): Promise<T> {
		const isInteraction = context instanceof BaseInteraction;

		return storage.run(
			isInteraction
				? { type: "interaction", interaction: context }
				: { type: "message", message: context },
			callback,
		);
	}

	/**
	 * Converts a message to a reply message object
	 * @param message - The message to convert
	 * @returns A reply message object with edit, delete, and followUp methods
	 */
	private static messageToReplyMessage(message: Message): ReplyMessage {
		const replyMessage: ReplyMessage = {
			id: message.id,
			edit: async (options: string | ExtendedMessageOptions) => {
				// Process options for Components v2 but no ephemeral (not supported in edits)
				const processedOptions = InteractionContext.processMessageOptions(
					options,
					false,
				);
				await message.edit(processedOptions);
			},
			delete: async () => {
				await message.delete();
			},
			followUp: async (options: string | ExtendedMessageOptions) => {
				// Process options for Components v2 but no ephemeral (not supported in message replies)
				const processedOptions = InteractionContext.processMessageOptions(
					options,
					false,
				);
				const reply = await message.reply(processedOptions);
				return InteractionContext.messageToReplyMessage(reply);
			},
		};

		return replyMessage;
	}

	/**
	 * Detects if message options contain Components v2 builders
	 * @param options - Message options to check
	 * @returns True if Components v2 are detected
	 */
	private static hasComponentsV2(options: ExtendedMessageOptions): boolean {
		if (!options.components || !Array.isArray(options.components)) {
			return false;
		}

		return options.components.some((component) => {
			return (
				component instanceof ContainerBuilder ||
				component instanceof SectionBuilder ||
				component instanceof TextDisplayBuilder ||
				component instanceof MediaGalleryBuilder ||
				component instanceof FileBuilder ||
				component instanceof SeparatorBuilder
			);
		});
	}

	/**
	 * Processes message options to set appropriate flags automatically
	 * @param options - Original message options
	 * @param allowEphemeral - Whether ephemeral messages are allowed in this context
	 * @returns Processed options with proper flags set
	 */
	private static processMessageOptions(
		options: string | ExtendedMessageOptions,
		allowEphemeral = true,
	): BaseMessageOptions & { flags?: number } {
		// Handle string content
		if (typeof options === "string") {
			return { content: options };
		}

		// Clone options to avoid modifying original
		const processedOptions = { ...options };
		let flags = processedOptions.flags || 0;

		// Auto-detect and set Components v2 flag
		if (InteractionContext.hasComponentsV2(processedOptions)) {
			flags |= MessageFlags.IsComponentsV2;
		}

		// Handle ephemeral flag - only for interaction replies
		if (processedOptions.ephemeral && allowEphemeral) {
			// Keep ephemeral property for interaction replies, also set flag
			flags |= MessageFlags.Ephemeral;
		} else if (processedOptions.ephemeral && !allowEphemeral) {
			// Log warning if ephemeral is requested but not allowed
			console.warn(
				"Ephemeral flag ignored - not supported in this context (edit or message reply)",
			);
		}

		// Set flags if any were added
		if (flags > 0) {
			processedOptions.flags = flags;
		}
		delete processedOptions.ephemeral;
		return processedOptions;
	}

	/**
	 * Gets the text-based channel from the current context
	 * @returns The text-based channel with send capability or null if not found
	 * @throws Error if not called within InteractionContext.run()
	 */
	private static getTextBasedChannel() {
		const channel = InteractionContext.getChannel();
		if (!channel || !channel.isTextBased() || !("send" in channel)) {
			return null;
		}
		return channel;
	}

	/**
	 * Gets the guild from the current context
	 * @returns The guild if context is an interaction or message, null otherwise
	 * @throws Error if not called within InteractionContext.run()
	 */
	private static getGuild() {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction" && context.interaction.guild)
			return context.interaction.guild;
		if (context.type === "message" && context.message.guild)
			return context.message.guild;
		return null;
	}

	/**
	 * Gets the channel from the current context
	 * @returns The channel from interaction or message
	 * @throws Error if no channel is found
	 */
	private static getChannel() {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction" && context.interaction.channel)
			return context.interaction.channel;
		if (context.type === "message") return context.message.channel;
		throw new Error("Channel not found");
	}

	/**
	 * Gets the current interaction context from async local storage
	 * @returns The current context
	 * @throws Error if no context is found (not called within InteractionContext.run())
	 */
	private static getInteractionContext(): InteractionContextType {
		const context = storage.getStore();
		if (!context) {
			throw new Error(
				"InteractionContext not found - must be called within InteractionContext.run()",
			);
		}
		return context;
	}
}
