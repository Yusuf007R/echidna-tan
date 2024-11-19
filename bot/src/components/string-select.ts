import { ComponentType } from "discord.js";
import BaseComponent from "./base";

export default class StringSelectComponent extends BaseComponent<ComponentType.StringSelect> {
	type = ComponentType.StringSelect as const;
}
