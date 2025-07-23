import { AsyncLocalStorage } from "node:async_hooks";
import {
	type AttachmentBuilder,
	BaseInteraction,
	type CacheType,
	type EmbedBuilder,
	type Interaction,
	type Message,
	type MessageCreateOptions,
	type MessageEditOptions,
	type ModalBuilder,
	type ModalSubmitInteraction,
	type User,
} from "discord.js";
import EchidnaSingleton from "./echidna-singleton";

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
			replyMessage?: Message;
	  };

/**
 * Async local storage for maintaining context throughout the request lifecycle
 */
const storage = new AsyncLocalStorage<InteractionContextType>();

/**
 * Options for sending messages with embeds, files, and ephemeral settings
 */
type messageOptions = {
	content?: string;
	embeds?: EmbedBuilder[];
	files?: AttachmentBuilder[];
	ephemeral?: boolean;
};

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
	 * Replies to the current context (interaction or message)
	 * Automatically handles reply vs editReply based on interaction state
	 * @param options - Message content or options object
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async reply(options: string | messageOptions): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;

			if (interaction.isRepliable()) {
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply(options);
				} else {
					await interaction.editReply(options);
				}
			}
		} else {
			// For message context, reply to the message and store the reply
			const message = context.message;
			const content =
				typeof options === "string" ? options : options.content || "";

			let replyMessage: Message;
			if (typeof options === "object" && options.embeds) {
				replyMessage = await message.reply({
					content,
					embeds: options.embeds,
					files: options.files,
				});
			} else {
				replyMessage = await message.reply(content);
			}

			// Store the reply message in the context for future edits
			context.replyMessage = replyMessage;
		}
	}

	/**
	 * Edits the reply in the current context
	 * For interactions: edits the interaction reply
	 * For messages: edits the stored reply message or creates one if none exists
	 * @param options - Message content or options object
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async editReply(options: string | messageOptions): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (interaction.isRepliable()) {
				await interaction.editReply(options);
			}
		} else {
			// For messages, edit the stored reply message if it exists
			if (context.replyMessage) {
				const content =
					typeof options === "string" ? options : options.content || "";
				if (typeof options === "object" && options.embeds) {
					await context.replyMessage.edit({
						content,
						embeds: options.embeds,
						files: options.files,
					});
				} else {
					await context.replyMessage.edit(content);
				}
			} else {
				// If no reply message exists yet, create one
				await InteractionContext.reply(options);
			}
		}
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
	 * Sends a follow-up message
	 * For interactions: uses interaction.followUp()
	 * For messages: replies to the original message
	 * @param options - Message content or options object
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async followUp(options: string | messageOptions): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (interaction.isRepliable()) {
				await interaction.followUp(options);
			}
		} else {
			// For messages, followUp should reply to maintain conversation flow
			const message = context.message;
			const content =
				typeof options === "string" ? options : options.content || "";

			if (typeof options === "object" && options.embeds) {
				await message.reply({
					content,
					embeds: options.embeds,
					files: options.files,
				});
			} else {
				await message.reply(content);
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

		const res =
			await EchidnaSingleton.echidna.interactionManager.waitForModalResponse(
				modal.data.custom_id!,
			);

		return res;
	}

	/**
	 * Sends a message directly to the channel (not as a reply)
	 * @param options - Message content or create options
	 * @returns Promise that resolves with the sent message
	 * @throws Error if not called within InteractionContext.run() or channel is not text-based
	 */
	static async sendInChannel(
		options: string | MessageCreateOptions,
	): Promise<Message> {
		const channel = InteractionContext.getTextBasedChannel();
		return await channel.send(options);
	}

	/**
	 * Edits a message in the current context
	 * For messages: edits the message itself
	 * For message context menu interactions: edits the target message
	 * @param options - Message edit options
	 * @throws Error if not called within InteractionContext.run()
	 */
	static async editMessage(options: MessageEditOptions): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "message") {
			await context.message.edit(options);
		} else if (context.type === "interaction") {
			// For message context menus, edit the target message
			const interaction = context.interaction;
			if (interaction.isMessageContextMenuCommand()) {
				await interaction.targetMessage.edit(options);
			}
		}
	}

	/**
	 * Safely replies with automatic fallback to channel send if reply fails
	 * @param options - Message content or options object
	 * @throws Error if not called within InteractionContext.run() (though errors are caught and logged)
	 */
	static async safeReply(options: string | messageOptions): Promise<void> {
		try {
			await InteractionContext.reply(options);
		} catch (error) {
			// Fallback to channel send if reply fails
			try {
				await InteractionContext.sendInChannel(options);
			} catch (fallbackError) {
				console.error("Failed to send response:", error, fallbackError);
			}
		}
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
	 * Gets the text-based channel from the current context
	 * @returns The text-based channel with send capability
	 * @throws Error if channel is not found or not text-based
	 */
	private static getTextBasedChannel() {
		const channel = InteractionContext.getChannel();
		if (!channel || !channel.isTextBased() || !("send" in channel)) {
			throw new Error("Channel not found or not text-based");
		}
		return channel;
	}

	/**
	 * Gets the channel from the current context
	 * @returns The channel from interaction or message
	 * @throws Error if no channel is found
	 */
	private static getChannel() {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction") return context.interaction.channel;
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
