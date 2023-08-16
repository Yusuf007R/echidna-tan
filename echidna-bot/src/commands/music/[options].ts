import { CacheType, CommandInteraction } from 'discord.js';
import { Player } from 'poru';
import GuildOnly from '../../event-validators/guild-only';
import VoiceChannelOnly from '../../event-validators/voice-channel-only';
import { Command, commandConfigs } from '../../structures/command';
import EventOptions from '../../structures/event-options';

export default class Options extends EventOptions {
  constructor() {
    super({validators: [GuildOnly, VoiceChannelOnly]});
  }
}


export abstract class MusicCommand extends Command {
  player?:Player;
  constructor(config:commandConfigs) {
    super(config);
  }

 async  _run(interaction: CommandInteraction<CacheType>): Promise<void> {
    this.player = this.echidna.musicPlayer.get(interaction.guildId!);
    super._run(interaction);
    
  }
}