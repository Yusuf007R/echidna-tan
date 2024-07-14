import { ButtonBuilder } from '@discordjs/builders';
import {
  APIButtonComponentWithCustomId,
  AwaitMessageCollectorOptionsParams,
  BaseInteraction,
  ButtonInteraction,
  CacheType,
  ComponentType
} from 'discord.js';

type FilterType = AwaitMessageCollectorOptionsParams<ComponentType.Button, true>['filter'];

type ButtonComponentOptions = Omit<Partial<APIButtonComponentWithCustomId>, 'type'> & {
  onSelect: (interaction: ButtonInteraction<CacheType>) => void;
  interaction: BaseInteraction<CacheType>;
  filter?: FilterType;
  timeout?: number;
  onError: (reason: any) => void;
  shouldValidateUser?: boolean;
};

export default function ButtonComponent({
  onSelect,
  onError,
  interaction,
  filter,
  timeout,
  shouldValidateUser = true,
  ...options
}: ButtonComponentOptions) {
  if (!interaction.channel) throw new Error('channel not found');
  const button = new ButtonBuilder(options);

  const defaultFilter: FilterType = (inter) => {
    if (inter.customId !== options.custom_id) return false;
    if (shouldValidateUser && interaction.user.id !== inter.user.id) return false;
    return true;
  };
 interaction.channel
    .awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: filter ?? defaultFilter,
      time: timeout ?? 60 * 1000
    })
    .then((interaction) => {
      onSelect(interaction);
    })
    .catch(onError);

  return button;
}
