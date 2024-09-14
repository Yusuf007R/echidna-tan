import ChatBot from '@AiStructures/chat-bot';
import { Command } from '@Structures/command';
import { OptionsBuilder } from '@Utils/options-builder';
import {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  CacheType,
  ChannelType,
  ChatInputCommandInteraction
} from 'discord.js';

const options = new OptionsBuilder()
  .addStringOption({
    name: 'model',
    description: 'Name of the model',
    required: false,
    autocomplete: true
  })
  .addStringOption({
    name: 'prompt',
    description: 'Prompt to use',
    required: false,
    autocomplete: true
  })
  .build();

export default class CreateChatCommand extends Command<typeof options> {
  constructor() {
    super({
      name: 'create-chat',
      description: 'Create a chat instance with a bot',
      cmdType: 'BOTH',
      shouldDefer: true,
      options,
      validators: []
    });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
    const option = this.options.focused;
    if (!option) return;
    const choices: ApplicationCommandOptionChoiceData[] = [];
    switch (option.name) {
      case 'model':
        {
          const modelList = await ChatBot.getModelList();
          const filtered = modelList
            .filter((model) => {
              if (!option.value) return true;
              return JSON.stringify(model).toLowerCase().includes(option.value.toLowerCase());
            })
            .slice(0, 8);
          choices.push(...filtered.map((model) => ({ name: model.name, value: model.id })));
        }
        break;
      case 'prompt':
        {
          const prompts = ChatBot.getPromptsTemplates();
          const filtered = prompts
            .filter((prompt) => {
              if (!option.value) return true;
              return JSON.stringify(prompt).toLowerCase().includes(option.value.toLowerCase());
            })
            .slice(0, 8);
          choices.push(
            ...filtered.map((prompt) => ({ name: prompt.promptTemplate.name, value: prompt.promptTemplate.name }))
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
    const channel = interaction.channel;

    if (channel?.type !== ChannelType.GuildText) return;
    const modelId = this.options.model || 'google/gemini-flash-1.5';
    const model = await ChatBot.getModel(modelId);

    if (!model) throw new Error('model not found');

    const promptName = this.options.prompt || 'Assistant';

    const prompt = ChatBot.getPromptsTemplates().find((prompt) => prompt.promptTemplate.name === promptName);

    if (!prompt) throw new Error('prompt not found');

    const thread = await channel.threads.create({
      name: model.name
    });

    const chatbot = new ChatBot(thread, model, interaction.user, prompt.promptTemplate);
    const collector = thread.createMessageCollector();

    collector.on('collect', (m) => {
      chatbot.processMessage(m);
    });
    interaction.editReply('New chatbot in thread created');
  }
}
