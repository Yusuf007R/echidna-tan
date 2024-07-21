import { ButtonBuilder, StringSelectMenuBuilder } from '@discordjs/builders';
import {
  AwaitMessageCollectorOptionsParams,
  BaseInteraction,
  ChannelSelectMenuBuilder,
  CollectedInteraction,
  ComponentType,
  MappedInteractionTypes,
  MentionableSelectMenuBuilder,
  MessageComponentType,
  RoleSelectMenuBuilder,
  User,
  UserSelectMenuBuilder
} from 'discord.js';

type FilterType<T extends MessageComponentType> = AwaitMessageCollectorOptionsParams<T, true>['filter'];

type onActionCallBack<T extends MessageComponentType> = (interaction: MappedInteractionTypes[T]) => Promise<void>;

export type BaseComponentOpts = {
  interaction: BaseInteraction;
};
export const MapComponentTypes = {
  [ComponentType.Button]: ButtonBuilder,
  [ComponentType.StringSelect]: StringSelectMenuBuilder,
  [ComponentType.UserSelect]: UserSelectMenuBuilder,
  [ComponentType.RoleSelect]: RoleSelectMenuBuilder,
  [ComponentType.MentionableSelect]: MentionableSelectMenuBuilder,
  [ComponentType.ChannelSelect]: ChannelSelectMenuBuilder
} as const;

export type ComponentOpt<T extends MessageComponentType> = NonNullable<
  ConstructorParameters<(typeof MapComponentTypes)[T]>[0]
> &
  BaseComponentOpts;

export default abstract class BaseComponent<T extends MessageComponentType> {
  abstract type: T;

  private _onError = (_reason: any) => {};
  private _filter: FilterType<T> = () => true;
  private _onAction?: onActionCallBack<T>;

  constructor(protected readonly opts: ComponentOpt<T>) {}

  static filterByUser = (actionInter: CollectedInteraction, userResolvable: BaseInteraction | User) => {
    let user: User | undefined;
    if (userResolvable instanceof BaseInteraction) user = userResolvable.user;
    if (userResolvable instanceof User) user = userResolvable;

    if (!user) throw new Error('internal error user not found');
    return actionInter.user.id === user.id;
  };

  static filterByCustomID = (actionInter: CollectedInteraction, customID: string) => {
    return actionInter.customId === customID;
  };

  onAction(cb: onActionCallBack<T>, timeout = 60 * 1000) {
    const { interaction } = this.opts;
    if (!this._onAction) {
      interaction.channel
        ?.awaitMessageComponent({
          componentType: this.type,
          filter: this._filter,
          time: timeout
        })
        .then(async (inter) => {
          await this._onAction?.(inter);
        })
        .catch(this._onError);
    }

    this._onAction = cb;

    return this;
  }

  onError(cb: (reason: any) => void) {
    this._onError = cb;
    return this;
  }

  onFilter(cb: FilterType<T>) {
    this._filter = cb;
    return this;
  }

  build(): InstanceType<(typeof MapComponentTypes)[T]> {
    const { interaction: _, ...data } = this.opts;
    const comp = MapComponentTypes[this.type];

    return new comp(data) as InstanceType<(typeof MapComponentTypes)[T]>;
  }
}
