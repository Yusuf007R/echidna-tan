import { ApplicationCommandOptionType, CacheType, CommandInteraction } from 'discord.js';
import { Option, OptionsTypeTable } from './options-builder';

type GetObjectPropType<O extends Option, T = OptionsTypeTable[O['type']]> = O extends { required: true }
  ? T
  : T | undefined;

export type OptionsArrayToObject<O extends Option[] | undefined = undefined> = O extends Option[]
  ? {
      [k in O[number]['name']]: GetObjectPropType<Extract<O[number], { name: k }>>;
    }
  : never;

class GetOptions {
  private _optionsObj: Record<string, any> = {};

  constructor(private optionsArray: Option[]) {}

  get options() {
    return this._optionsObj;
  }

  loadFromCommandInteraction(interaction: CommandInteraction<CacheType>) {
    for (let i = 0; i < this.optionsArray.length; i++) {
      const optObj = this.optionsArray[i];
      //@ts-expect-error this is okay
      const required = (optObj.required as boolean) || false;

      const opt = interaction.options.get(optObj.name);

      if (!opt) {
        if (required === true) {
          throw new Error('idk how but the required option is null xd');
        }
        continue;
      }

      switch (opt.type) {
        case ApplicationCommandOptionType.User:
          this._optionsObj[opt.name] = opt.user;
          break;
        case ApplicationCommandOptionType.Attachment:
          this._optionsObj[opt.name] = opt.options;
          break;
        default:
          this._optionsObj[opt.name] = opt.value;
          break;
      }
    }
  }
}

export default GetOptions;