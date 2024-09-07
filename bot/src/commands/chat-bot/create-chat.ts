import ChatBot from '@Structures/chat-bot';
import { Command } from '@Structures/command';
import { CacheType, ChannelType, CommandInteraction } from 'discord.js';

// const options = new OptionsBuilder()
//   .addStringOption({
//     name: 'mode',
//     description: 'Name of the anime you want to search for',
//     autocomplete: true,
//     required: true
//   })
//   .build();

export default class CreateChat extends Command {
  constructor() {
    super({
      name: 'create-chat',
      description: 'Create a chat instance with a bot',
      cmdType: 'BOTH',
      shouldDefer: true
    });
  }

  // async handleAutocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
  //   const focusedValue = interaction.options
  //   const animeList = await Anime.searchForAnimeByTerm(focusedValue);
  //   await interaction.respond(animeList.map((anime) => ({ name: anime.title.default, value: anime.id.toString() })));
  // }

  async run(interaction: CommandInteraction<CacheType>) {
    const channel = interaction.channel;
    if (channel?.type !== ChannelType.GuildText) return;
    const thread = await channel.threads.create({
      name: 'Chat'
    });

    const chatbot = new ChatBot(thread.id, 'anthropic/claude-3.5-sonnet', interaction.user);
    const collector = thread.createMessageCollector();

    collector.on('collect', (m) => {
      chatbot.processMessage(m);
    });
    interaction.editReply('New chatbot in thread created');
  }
}
