
import Anime from '@Structures/anime';
import { CacheType, CommandInteraction } from 'discord.js';
import { Command } from '../../structures/command';

export default class SearchAnimeCommand extends Command {
  constructor() {
    super({
      name: 'search-anime',
      description: 'Search for an anime',
      cmdType: 'BOTH',
      options: []
    });
  }

  async run(interaction: CommandInteraction<CacheType>) {
    await interaction.deferReply();

    try {
      const anime = await Anime.getRandomAnime();
      const embed = Anime.getAnimeEmbed(anime);

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Error fetching random anime:', error);
      await interaction.editReply('An error occurred while fetching a random anime. Please try again later.');
    }
  }
}
