import GetOptions, { OptionsArrayToObject } from '@Utils/get-options';
import { Option } from '@Utils/options-builder';
import { AutocompleteInteraction, CacheType, CommandInteraction } from 'discord.js';
import { CommandValidator } from './command-validator';
import EchidnaSingleton from './echidna-singleton';

export type CmdType = 'GUILD' | 'DM' | 'BOTH';

export type commandConfigs<O extends Option[] | undefined = undefined> = O extends undefined
  ? {
      name: string;
      description: string;
      shouldDefer?: boolean;
      validators?: Array<new () => CommandValidator>;
      cmdType?: CmdType;
    }
  : {
      name: string;
      description: string;
      options: O;
      shouldDefer?: boolean;
      validators?: Array<new () => CommandValidator>;
      cmdType?: CmdType;
    };

export abstract class Command<O extends Option[] | undefined = undefined, E = any> extends EchidnaSingleton {
  readonly name: string;

  readonly description: string;

  readonly _optionsArray: O | null = null;

  readonly shouldDefer?: boolean;

  readonly validators: Array<new () => CommandValidator>;
  readonly cmdType!: CmdType;
  private _getOptionsInstance;

  get options(): OptionsArrayToObject<O> {
    return this._getOptionsInstance.options as any;
  }

  constructor(readonly configs: commandConfigs<O>) {
    super();
    this.name = configs.name;
    this.description = configs.description;

    //@ts-expect-error this is fine typescript is just being a crybaby
    this._optionsArray = configs.options || null;
    this.shouldDefer = configs.shouldDefer;
    this.validators = configs.validators || [];
    this.cmdType = configs.cmdType || 'GUILD';
    this._getOptionsInstance = new GetOptions(this._optionsArray ?? []);
  }

  abstract run(_interaction: CommandInteraction<CacheType>, ..._rest: unknown[]): Promise<void>;

  async handleAutocomplete(_interaction: AutocompleteInteraction<CacheType>): Promise<E> {
    return Promise.resolve() as E;
  }

  // async _handleAutocomplete(_interaction: AutocompleteInteraction<CacheType>): Promise<E> {}
  async _run(interaction: CommandInteraction<CacheType>) {
    const validators = this.validators.map((validator) => new validator().validate(interaction));

    if (!(await Promise.all(validators)).every((validator) => validator)) return;
    if (this.shouldDefer) await interaction.deferReply();
    this._getOptionsInstance.loadFromCommandInteraction(interaction);
    await this.run(interaction);
    return;
  }
}
