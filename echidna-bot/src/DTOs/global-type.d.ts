
import {CacheType, CommandInteraction} from 'discord.js';
import discordjs from 'discord.js';

declare module 'discord.js' {
  import GetChoices from '../utils/get-choices';
  class temp  extends CommandInteraction<T>  {
    choices: GetChoices;
  }

   CommandInteraction<T> = temp;

}

