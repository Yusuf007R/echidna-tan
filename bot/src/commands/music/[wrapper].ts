import GuildOnly from '@EventsValidators/guild-only';
import VoiceChannelOnly from '@EventsValidators/voice-channel-only';
import { Command, commandConfigs } from '@Structures/command';
import { CommandValidator } from '@Structures/command-validator';
import { QueueMetadata } from '@Structures/music-player';
import { Option } from '@Utils/options-builder';
import { GuildQueue } from 'discord-player';
import { CacheType, CommandInteraction } from 'discord.js';

export abstract class MusicCommand<O extends Option[] | undefined = undefined> extends Command<O> {
  player: GuildQueue<QueueMetadata> | null = null;

  constructor(config: commandConfigs<O>) {
    const validators: Array<new () => CommandValidator> = [GuildOnly, VoiceChannelOnly];
    if (config.validators) validators.push(...config.validators);
    super({ ...config, validators, shouldDefer: true });
  }

  async _run(interaction: CommandInteraction<CacheType>): Promise<void> {
    this.player = this.echidna.musicPlayer.nodes.get(interaction.guild!);
    await super._run(interaction);
  }
}
