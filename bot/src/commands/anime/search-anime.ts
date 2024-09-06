
import Anime from '@Structures/anime';
import { AutocompleteInteraction, CacheType, CommandInteraction } from 'discord.js';
import { Command } from '../../structures/command';

export default class SearchAnimeCommand extends Command {
  constructor() {
    super({
      name: 'search-anime',
      description: 'Search for an anime',
      cmdType: 'BOTH',
      options: [{
        name: 'anime-name',
        autocomplete: true,
        description: "Name of the anime you want to search for",
        type: "string",
        required: true
      }]
    });
  }

  async HandleAutocomplete(interaction: AutocompleteInteraction<CacheType>): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const animeList = await Anime.searchForAnimeByTerm(focusedValue);
    await interaction.respond(
			animeList.map(anime => ({ name: anime.title.default, value: anime.id.toString() })),
		);
  }

  async run(interaction: CommandInteraction<CacheType>) {
    await interaction.deferReply();

    try {
      const animeID = this.choices.getString("anime-name", true);

      const anime = await Anime.getAnimeByID(animeID);
      
      if(!anime){
        throw new Error("Internal Error");
      }
      const embed = Anime.getAnimeEmbed(anime);
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      console.error('Error fetching random anime:', error);
      await interaction.editReply('An error occurred while fetching a random anime. Please try again later.');
    }
  }
}
