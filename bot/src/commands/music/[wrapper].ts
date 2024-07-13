import { CommandValidator } from '@Structures/command-validator';
import { QueueMetadata } from '@Structures/music-player';
import { GuildQueue } from 'discord-player';
import { CacheType, CommandInteraction } from 'discord.js';
import GuildOnly from '../../event-validators/guild-only';
import VoiceChannelOnly from '../../event-validators/voice-channel-only';
import { Command, commandConfigs } from '../../structures/command';

export abstract class MusicCommand extends Command {
  player: GuildQueue<QueueMetadata> | null = null;

  constructor(config: commandConfigs) {
    const validators: Array<new () => CommandValidator> = [GuildOnly, VoiceChannelOnly];
    if (config.validators) validators.push(...config.validators);
    super({ ...config, validators, shouldDefer: true });
  }

  async _run(interaction: CommandInteraction<CacheType>): Promise<void> {
    this.player = this.echidna.musicPlayer.nodes.get(interaction.guild!);
    await super._run(interaction);
  }
}
