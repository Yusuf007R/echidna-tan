import {DiscordEvent} from '../structures/discord-events';

export default class ErrorEvent extends DiscordEvent {
  constructor() {
    super({eventName: 'error'});
  }

  async run(error: Error): Promise<void> {
    console.error('Client error:', error);
  }
}
