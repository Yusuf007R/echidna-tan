import ChatBot from '@AiStructures/chat-bot';
import { Command } from '@Structures/command';
import { OptionsBuilder } from '@Utils/options-builder';
import { AutocompleteInteraction, CacheType, ChannelType, ChatInputCommandInteraction } from 'discord.js';

const options = new OptionsBuilder()
  .addStringOption({
    name: 'model',
    description: 'Name of the model',
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
      options
    });
  }

  async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>) {
    const focusedValue = interaction.options.getFocused();
    const modelList = await ChatBot.getModelList();

    const filtered = modelList
      .filter((model) => {
        if (!focusedValue) return true;
        return JSON.stringify(model).toLowerCase().includes(focusedValue.toLowerCase());
      })
      .slice(0, 8);

    try {
      await interaction.respond(
        filtered.map((model) => ({
          name: model.name,
          value: model.id
        }))
      );
    } catch (error) {
      console.log(error);
    }
    return filtered;
  }

  async run(interaction: ChatInputCommandInteraction<CacheType>) {
    const channel = interaction.channel;
    if (channel?.type !== ChannelType.GuildText) return;
    const thread = await channel.threads.create({
      name: this.options.model || 'chat'
    });

    const chatbot = new ChatBot(thread, this.options.model ?? 'sao10k/l3.1-euryale-70b', interaction.user);
    const collector = thread.createMessageCollector();

    collector.on('collect', (m) => {
      chatbot.processMessage(m);
    });
    interaction.editReply('New chatbot in thread created');
  }
}
