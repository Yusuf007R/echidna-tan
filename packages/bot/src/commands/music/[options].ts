import {CacheType, CommandInteraction} from 'discord.js';
import GuildOnly from '../../event-validators/guild-only';
import VoiceChannelOnly from '../../event-validators/voice-channel-only';
import {Command, commandConfigs} from '../../structures/command';
import CustomPlayer from '../../structures/custom-player';
import EventOptions from '../../structures/event-options';

export default class Options extends EventOptions {
  constructor() {
    super({validators: [GuildOnly, VoiceChannelOnly]});
  }
}

export abstract class MusicCommand extends Command {
  player?: CustomPlayer;
  constructor(config: commandConfigs) {
    super(config);
  }

  async _run(interaction: CommandInteraction<CacheType>): Promise<void> {
    this.player = this.echidna.musicPlayer.get(interaction.guildId!);
    await super._run(interaction);
  }
}
