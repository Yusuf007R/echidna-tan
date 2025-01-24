import type { ContextMenuCommandInteraction, Message, User } from "discord.js";
import EchidnaSingleton from "./echidna-singleton";

export type ContextMenuType = "USER" | "MESSAGE";

type ContextMenuConfigs<T extends ContextMenuType | undefined = undefined> = {
	name: string;
	type: T;
	description: string;
};

abstract class ContextMenu<
	T extends ContextMenuType | undefined = undefined,
> extends EchidnaSingleton {
	name: string;
	type: T;
	description: string;

	target: T extends "USER" ? User : Message;

	constructor(configs: ContextMenuConfigs<T>) {
		super();
		this.name = configs.name;
		this.type = configs.type;
		this.description = configs.description;
		this.target = null as any;
	}

	abstract run(
		interaction: ContextMenuCommandInteraction,
		..._rest: unknown[]
	): Promise<void>;

	async _run(interaction: ContextMenuCommandInteraction) {
		if (interaction.isUserContextMenuCommand()) {
			this.target = interaction.targetUser as any;
		} else if (interaction.isMessageContextMenuCommand()) {
			this.target = interaction.targetMessage as any;
		}
		await this.run(interaction);
	}
}

export default ContextMenu;
