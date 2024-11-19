import { ComponentType } from "discord.js";
import BaseComponent from "./base";

export default class ButtonComponent extends BaseComponent<ComponentType.Button> {
	type = ComponentType.Button as const;
}
