import { StringSelectMenuBuilder } from '@discordjs/builders';
import {
  APIStringSelectComponent,
  AwaitMessageCollectorOptionsParams,
  BaseInteraction,
  CacheType,
  ComponentType,
  StringSelectMenuInteraction
} from 'discord.js';

type FilterType = AwaitMessageCollectorOptionsParams<ComponentType.StringSelect, true>['filter'];

type StringSelectComponentOptions = Omit<Partial<APIStringSelectComponent>, 'type'> & {
  onSelect: (interaction: StringSelectMenuInteraction<CacheType>) => void;
  interaction: BaseInteraction<CacheType>;
  filter?: FilterType;
  timeout?: number;
  onError: (reason: any) => void;
};

export default function StringSelectComponent({
  onSelect,
  onError,
  interaction,
  filter,
  timeout,
  ...options
}: StringSelectComponentOptions) {
  if (!interaction.channel) throw new Error('channel not found');
  const stringSelect = new StringSelectMenuBuilder(options);

  const defaultFilter: FilterType = (inter) => {
    if (inter.customId !== options.custom_id) return false;
    if (interaction.user.id !== inter.user.id) return false;
    return true;
  };
  interaction.channel
    .awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      filter: filter ?? defaultFilter,
      time: timeout ?? 60 * 1000
    })
    .then((interaction) => {
      onSelect(interaction);
    })
    .catch(onError);

  return stringSelect;
}
