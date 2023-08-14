import { BaseInteraction, CacheType } from 'discord.js';
import Base from './base';

type EventValidatorConfig = {
  name: string;
  description: string;
  message?: string;
};

export type EventValidatorNext = () => void;

export class EventValidator extends Base{
  name: string;
  description: string;
  message: string;
  resolve: (value: boolean) => void = () => {};
  reject: () => void = () => {};

  constructor(configs: EventValidatorConfig) {
    super();
    this.name = configs.name;
    this.description = configs.description;
    this.message = configs.message || '';
  }

  async isValid(
    _interaction: BaseInteraction<CacheType>,
    _next: EventValidatorNext,
  ) {
    return;
  }

  validate(interaction: BaseInteraction<CacheType>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.isValid(interaction, ()=>resolve(true)).then(() => resolve(false));
    });
  }


  sendMessage(interaction: BaseInteraction<CacheType>) {
    if (interaction.isCommand()) {
      interaction.reply(this.message);
    } else if (interaction.isButton()) {
      interaction.reply(this.message);
    }
  }
}
