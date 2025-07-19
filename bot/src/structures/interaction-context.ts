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

const storage = new AsyncLocalStorage<InteractionContextType>();

type messageOptions = {
	content?: string;
	embeds?: EmbedBuilder[];
	files?: AttachmentBuilder[];
	ephemeral?: boolean;
};

/*
Universal wrapper around interactions and messages for consistent API across the bot.
Handles defer system, reply, send, edit, embeds - abstracts away the complexity of 
different interaction types and provides fallback mechanisms.

Features:
- Automatic defer handling
- Smart reply/editReply/followUp routing
- Message vs Interaction abstraction
- Channel validation and error handling
- Async local storage for context passing
*/

export class InteractionContext {
	static get user(): User {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction") return context.interaction.user;
		if (context.type === "message") return context.message.author;
		throw new Error("User not found");
	}

	// Core response methods
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

	static async followUp(options: string | messageOptions): Promise<void> {
		const context = InteractionContext.getInteractionContext();

		if (context.type === "interaction") {
			const interaction = context.interaction;
			if (interaction.isRepliable()) {
				await interaction.followUp(options);
			}
		} else {
			// For messages, followUp is just another send
			await InteractionContext.sendInChannel(options);
		}
	}

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
			await EchidnaSingleton.echidna.modalManager.waitForModalResponse(
				modal.data.custom_id!,
			);

		return res;
	}

	// Channel messaging
	static async sendInChannel(
		options: string | MessageCreateOptions,
	): Promise<Message> {
		const channel = InteractionContext.getTextBasedChannel();
		return await channel.send(options);
	}

	// Message editing (for context menus on messages)
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

	// Error handling with fallbacks
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

	// Utility methods
	static isInteraction(): boolean {
		const context = InteractionContext.getInteractionContext();
		return context.type === "interaction";
	}

	static isMessage(): boolean {
		const context = InteractionContext.getInteractionContext();
		return context.type === "message";
	}

	static getInteraction(): BaseInteraction<CacheType> | null {
		const context = InteractionContext.getInteractionContext();
		return context.type === "interaction" ? context.interaction : null;
	}

	static getMessage(): Message | null {
		const context = InteractionContext.getInteractionContext();
		return context.type === "message" ? context.message : null;
	}

	// State checking
	static isReplied(): boolean {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction" && context.interaction.isRepliable()) {
			return context.interaction.replied;
		}
		return false;
	}

	static isDeferred(): boolean {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction" && context.interaction.isRepliable()) {
			return context.interaction.deferred;
		}
		return false;
	}

	// Context management
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

	private static getTextBasedChannel() {
		const channel = InteractionContext.getChannel();
		if (!channel || !channel.isTextBased() || !("send" in channel)) {
			throw new Error("Channel not found or not text-based");
		}
		return channel;
	}

	private static getChannel() {
		const context = InteractionContext.getInteractionContext();
		if (context.type === "interaction") return context.interaction.channel;
		if (context.type === "message") return context.message.channel;
		throw new Error("Channel not found");
	}

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
