import { zodFunction } from "openai/helpers/zod";
import type { z } from "zod";
import EchidnaSingleton from "./echidna-singleton";
export type ToolConfigs<
	S extends z.ZodObject<any, any> = z.ZodObject<any, any>,
> = {
	name: string;
	description: string;
	schema: S;
};

export abstract class Tool<
	S extends z.ZodObject<any, any> = z.ZodObject<any, any>,
> extends EchidnaSingleton {
	readonly name: string;
	readonly description: string;
	readonly schema: S;

	constructor(readonly configs: ToolConfigs<S>) {
		super();
		this.name = configs.name;
		this.description = configs.description;
		this.schema = configs.schema;
	}

	abstract run(params: z.infer<S>): Promise<any>;

	toJSON() {
		return zodFunction({
			name: this.name,
			parameters: this.schema,
			description: this.description,
		});
	}
}
