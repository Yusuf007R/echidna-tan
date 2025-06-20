import GuildOnly from "@EventsValidators/guild-only";
import VoiceChannelOnly from "@EventsValidators/voice-channel-only";
import { Command, type commandConfigs } from "@Structures/command";
import type { CommandValidator } from "@Structures/command-validator";
import type { QueueMetadata } from "@Structures/music-player";
import type { Option } from "@Utils/options-builder";
import type { CacheType, CommandInteraction } from "discord.js";
import type { GuildQueue } from "discord-player";

export abstract class MusicCommand<
	O extends Option[] | undefined = undefined,
> extends Command<O> {
	player: GuildQueue<QueueMetadata> | null = null;

	constructor(config: commandConfigs<O>) {
		const validators: Array<new () => CommandValidator> = [
			GuildOnly,
			VoiceChannelOnly,
		];
		if (config.validators) validators.push(...config.validators);
		super({ ...config, validators, shouldDefer: true });
	}

	async _run(interaction: CommandInteraction<CacheType>): Promise<void> {
		this.player = this.echidna.musicPlayer.nodes.get(interaction.guild!);
		await super._run(interaction);
	}
}
