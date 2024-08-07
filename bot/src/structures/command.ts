import { CacheType, CommandInteraction } from 'discord.js';
import GetChoices from '../utils/get-choices';
import { CommandValidator } from './command-validator';
import EchidnaSingleton from './echidna-singleton';

export type Options =
  | {
      type: 'string';
      name: string;
      description: string;
      required?: boolean;
      choices?: string[];
    }
  | {
      type: 'bool';
      name: string;
      description: string;
      required?: boolean;
    }
  | {
      type: 'int';
      name: string;
      description: string;
      required?: boolean;
      min?: number;
      max?: number;
    }
  | {
      type: 'sub-command';
      name: string;
      description: string;
      options?: Options[];
    }
  | {
      type: 'user';
      name: string;
      description: string;
      required?: boolean;
    }
  | {
      type: 'attachment';
      name: string;
      description: string;
      required?: boolean;
    };

export type CmdType = 'GUILD' | 'DM' | 'BOTH';

export type commandConfigs = {
  name: string;
  description: string;
  options?: Options[];
  shouldDefer?: boolean;
  validators?: Array<new () => CommandValidator>;
  cmdType?: CmdType;
};

export abstract class Command extends EchidnaSingleton {
  readonly name: string;

  readonly description: string;

  readonly options?: Options[];

  readonly shouldDefer?: boolean;

  readonly validators: Array<new () => CommandValidator>;
  readonly cmdType!: CmdType;
  private _choices!: GetChoices;

  get choices() {
    return this._choices;
  }

  constructor(readonly configs: commandConfigs) {
    super();
    this.name = configs.name;
    this.description = configs.description;
    this.options = configs.options;
    this.shouldDefer = configs.shouldDefer;
    this.validators = configs.validators || [];
    this.cmdType = configs.cmdType || 'GUILD';
  }

  abstract run(_interaction: CommandInteraction<CacheType>, ..._rest: unknown[]): Promise<void>;

  async _run(interaction: CommandInteraction<CacheType>) {
    const validators = this.validators.map((validator) => new validator().validate(interaction));

    if (!(await Promise.all(validators)).every((validator) => validator)) return;
    if (this.shouldDefer) await interaction.deferReply();
    this._choices = new GetChoices(interaction.options);
    await this.run(interaction, this.choices);
    return;
  }
}
