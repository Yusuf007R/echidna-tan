import {
  ApplicationCommandOptionType,
  AutocompleteFocusedOption,
  AutocompleteInteraction,
  CacheType,
  CommandInteraction
} from 'discord.js';
import { Option, OptionsTypeTable } from './options-builder';

type GetObjectPropType<O extends Option, T = OptionsTypeTable[O['type']]> = O extends { required: true }
  ? T
  : T | undefined;

export type OptionsArrayToObject<O extends Option[] | undefined = undefined> = O extends Option[]
  ? {
      [k in O[number]['name']]: GetObjectPropType<Extract<O[number], { name: k }>>;
    }
  : never;

export type OptionsObjectType<O extends Option[] | undefined = undefined> = OptionsArrayToObject<O> & {
  focused?: O extends Option[]
    ? {
        name: O[number]['name'];
        value: GetObjectPropType<Extract<O[number], { name: O[number]['name'] }>>;
      }
    : never;
};

class GetOptions<O extends Option[] | undefined = undefined> {
  private _optionsObj: Record<string, any> = {};
  private _focusedOption: AutocompleteFocusedOption | undefined = undefined;

  constructor(private optionsArray: Option[]) {}

  get options(): OptionsObjectType<O> {
    const focused = this._focusedOption
      ? { name: this._focusedOption.name, value: this._focusedOption.value }
      : undefined;
    return { focused, ...this._optionsObj } as any;
  }

  loadFromCommandInteraction(interaction: CommandInteraction<CacheType> | AutocompleteInteraction<CacheType>) {
    if (interaction instanceof AutocompleteInteraction) {
      this._focusedOption = interaction.options.getFocused(true);
    }

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
          this._optionsObj[opt.name] = opt.attachment;
          break;
        default:
          this._optionsObj[opt.name] = opt.value;
          break;
      }
    }
  }
}

export default GetOptions;
