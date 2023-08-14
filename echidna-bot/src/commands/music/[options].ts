import GuildOnly from '../../event-validators/guild-only';
import VoiceChannelOnly from '../../event-validators/voice-channel-only';
import EventOptions from '../../structures/event-options';

export default class Options extends EventOptions {
  constructor() {
    super({validators: [GuildOnly, VoiceChannelOnly]});
  }
}
