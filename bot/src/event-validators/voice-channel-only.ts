import {
	CommandValidator,
	type CommandValidatorNext,
} from "@Structures/command-validator";
import type { CacheType, GuildMember, Interaction } from "discord.js";

export default class VoiceChannelOnly extends CommandValidator {
	constructor() {
		super({
			name: "voice-channel-only",
			description: "Events that can only be used in voice channels.",
			message: "You must be in a voice channel to use this command.",
		});
	}

	async isValid(
		interaction: Interaction<CacheType>,
		next: CommandValidatorNext,
	) {
		if (!interaction.inGuild()) return;
		if (!(interaction.member as GuildMember).voice.channel) {
			return await this.sendMessage(interaction);
		}
		next();
	}
}
