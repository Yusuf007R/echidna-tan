import { AsyncLocalStorage } from "node:async_hooks";
import {
	BaseInteraction,
	type BaseMessageOptions,
	type CacheType,
	type Channel,
	type Interaction,
	type Message,
	type MessageCreateOptions,
	type MessageEditOptions,
	type ModalBuilder,
	type ModalSubmitInteraction,
	type OmitPartialGroupDMChannel,
	type User,
} from "discord.js";
import EchidnaSingleton from "./echidna-singleton";

export type ReplyMessage = {
	id: string;
	edit: (options: string | BaseMessageOptions) => Promise<Message>;
	delete: () => Promise<void>;
	followUp: (options: string | BaseMessageOptions) => Promise<ReplyMessage>;
};

/**
 * Context type that represents either an interaction or message context
 */
type InteractionContextType =
	| {
			type: "interaction";
			interaction: BaseInteraction<CacheType>;
			replyMessage?: {
				edit: (options: string | BaseMessageOptions) => Promise<Message>;
			};
	  }
	| {
			type: "message";
			message: Message;
			replyMessage?: {
				edit: (options: string | BaseMessageOptions) => Promise<Message>;
			};
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
	 * Sends a reply to the current context (interaction or message)
	 * Automatically handles reply vs editReply based on interaction state
	 * Handles followUp logic
	 * Handles fallback to sendInChannel if none of the above are possible
	 * @param options - Message content or options object
	 * @throws Error if not called within InteractionContext.run()
	 */
	private static async sendReply(
		options: string | BaseMessageOptions,
	): Promise<ReplyMessage> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (interaction.isRepliable()) {
				if (interaction.deferred || interaction.replied) {
					const edit = await interaction.editReply(options);
					return {
						id: edit.id,
						edit: (options: string | BaseMessageOptions) =>
							edit.editReply(options),
						delete: () => edit.deleteReply(),
						followUp: (options: string | BaseMessageOptions) =>
							interaction.followUp(options),
					};
				}
				if (!interaction.replied && !interaction.deferred) {
					const reply = await interaction.reply(options);
					return {
						id: reply.id,
						edit: (options: string | BaseMessageOptions) =>
							interaction.editReply(options),
						delete: () => interaction.deleteReply(),
						followUp: (options: string | BaseMessageOptions) =>
							interaction.followUp(options),
					};
				}
			}
		} else {
			const reply = await context.message.reply(options);
			return {
				id: reply.id,
				edit: (options: string | BaseMessageOptions) => reply.edit(options),
				delete: async () => {
					await reply.delete();
				},
				followUp: async (options: string | BaseMessageOptions) => {
					const reply2 = await context.message.reply(options);
					return {
						id: reply2.id,
						edit: (options: string | BaseMessageOptions) =>
							reply2.edit(options),
						delete: async () => {
							await reply2.delete();
						},
						followUp: async (options: string | BaseMessageOptions) => {
							await context.message.reply(options);
						},
					};
				},
			};
		}

		// Fallback for non-repliable or no replyMessage
		const fallback = await InteractionContext.sendInChannel(options);
		return {
			id: fallback.id,
			edit: (options: string | BaseMessageOptions) => fallback.edit(options),
			delete: async () => {
				await fallback.delete();
			},
			followUp: (options: string | BaseMessageOptions) =>
				InteractionContext.sendInChannel(options),
		};
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
		options: string | MessageCreateOptions,
	): Promise<Message> {
		const channel = InteractionContext.getTextBasedChannel();
		if (!channel) throw new Error("Channel not found or not text-based");
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
	private static messageToReplyMessage(
		message: Message | Interaction,
	): ReplyMessage {
		return {
			id: message.id,
			edit: (options: string | BaseMessageOptions) => {
				if (message instanceof Message) {
					return message.edit(options);
				}
				return message.editReply(options);
			},
			delete: async () => {
				await message.delete();
			},
			followUp: async (options: string | BaseMessageOptions) => {
				const reply = await message.reply(options);
				return InteractionContext.messageToReplyMessage(reply);
			},
		};
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
