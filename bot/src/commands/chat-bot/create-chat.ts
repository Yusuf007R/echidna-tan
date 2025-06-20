import ChatBotManager from "@Managers/chat-bot-manager";
import { UserManager } from "@Managers/user-manager";
import { Command } from "@Structures/command";
import { OptionsBuilder } from "@Utils/options-builder";
import {
	type ApplicationCommandOptionChoiceData,
	type AutocompleteInteraction,
	type CacheType,
	ChannelType,
	type ChatInputCommandInteraction,
} from "discord.js";

const options = new OptionsBuilder()
	.addStringOption({
		name: "model",
		description: "Name of the model",
		required: false,
		autocomplete: true,
	})
	.addStringOption({
		name: "prompt",
		description: "Prompt to use",
		required: false,
		autocomplete: true,
	})
	.build();

export default class CreateChatCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "create-chat",
			description: "Create a chat instance with a bot",
			cmdType: "BOTH",
			shouldDefer: true,
			options,
			validators: [],
		});
	}

	async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
		const option = this.options.focused;
		if (!option) return;
		const choices: ApplicationCommandOptionChoiceData[] = [];
		switch (option.name) {
			case "model":
				{
					const modelList = await ChatBotManager.getModelList(option.value);

					choices.push(
						...modelList
							.slice(0, 8)
							.map((model) => ({ name: model.name, value: model.id })),
					);
				}
				break;
			case "prompt":
				{
					const prompts = await ChatBotManager.getPromptsTemplates();
					const filtered = prompts
						.filter((prompt) => {
							if (!option.value) return true;
							return JSON.stringify(prompt)
								.toLowerCase()
								.includes(option.value.toLowerCase());
						})
						.slice(0, 8);
					choices.push(
						...filtered.map((prompt) => ({
							name: prompt.promptTemplate.name,
							value: prompt.promptTemplate.name,
						})),
					);
				}
				break;
			default:
				break;
		}

		try {
			await interaction.respond(choices);
		} catch (error) {
			console.log(error);
		}
		return choices;
	}

	async run(interaction: ChatInputCommandInteraction<CacheType>) {
		const user = await UserManager.getOrCreateUser(interaction.user.id);
		if (!user) throw new Error("Internal error, try again later.");
		const channel = interaction.channel;

		if (channel?.type !== ChannelType.GuildText) {
			await interaction.editReply(
				"This command can only be used in text channels.",
			);
			return;
		}

		const modelId = this.options.model || "google/gemini-flash-1.5";
		const model = await ChatBotManager.getModel(modelId);

		if (!model) throw new Error("model not found");

		const promptName = this.options.prompt || "Assistant";

		const prompt = (await ChatBotManager.getPromptsTemplates()).find(
			(prompt) => prompt.promptTemplate.name === promptName,
		);

		if (!prompt) throw new Error("prompt not found");

		const thread = await channel.threads.create({
			name: model.name,
			type: ChannelType.PrivateThread,
		});

		await thread.send({
			content: `Thread Created by <@${interaction.user.id}> - ${model.name}`,
		});

		const chatbot = await ChatBotManager.createChatBot(
			thread,
			user,
			prompt.promptTemplate,
			modelId,
		);

		if (!chatbot) throw new Error("Failed to create chatbot");

		interaction.editReply("New chatbot in thread created");
	}
}
