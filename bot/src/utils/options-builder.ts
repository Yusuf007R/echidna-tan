import type { Attachment, User } from "discord.js";

type StringOption = {
	type: "string";
	name: string;
	description: string;
	required?: boolean;
	choices?: readonly string[];
	autocomplete?: boolean;
};

type BoolOption = {
	type: "bool";
	name: string;
	description: string;
	required?: boolean;
};

type IntOption = {
	type: "int";
	name: string;
	description: string;
	required?: boolean;
	min?: number;
	max?: number;
};

type UserOption = {
	type: "user";
	name: string;
	description: string;
	required?: boolean;
};

type AttachmentOption = {
	type: "attachment";
	name: string;
	description: string;
	required?: boolean;
};

type SubCommandOption = {
	type: "sub-command";
	name: string;
	description: string;
	options: Option[];
};

export type OptionsTypeTable = {
	user: User;
	string: string;
	int: number;
	attachment: Attachment;
	bool: boolean;
	"sub-command": any;
};

type Expand<T> = T extends infer O ? { readonly [K in keyof O]: O[K] } : never;

export type Option =
	| StringOption
	| BoolOption
	| IntOption
	| UserOption
	| AttachmentOption
	| SubCommandOption;

export class OptionsBuilder<const T extends Option[] = []> {
	private options: T = [] as unknown as T;

	addStringOption<const O extends Omit<StringOption, "type">>(
		config: O,
	): OptionsBuilder<[...T, Expand<O & { type: "string" }>]> {
		this.options.push({ type: "string", ...config });

		return this as any;
	}

	addBoolOption<const O extends Omit<BoolOption, "type">>(
		config: O,
	): OptionsBuilder<[...T, Expand<O & { type: "bool" }>]> {
		this.options.push({ type: "bool", ...config });

		return this as any;
	}

	addIntOption<const O extends Omit<IntOption, "type">>(
		config: O,
	): OptionsBuilder<[...T, Expand<O & { type: "int" }>]> {
		this.options.push({ type: "int", ...config });

		return this as any;
	}

	addSubCommandOption<
		const O extends Omit<SubCommandOption, "type" | "options">,
		TO extends Option[] = [],
	>(
		config: O,
		optionsBuilder: (builder: OptionsBuilder) => OptionsBuilder<TO>,
	): OptionsBuilder<[...T, Expand<O & { type: "sub-command"; options: TO }>]> {
		const subCommandOptions = optionsBuilder(new OptionsBuilder()).build();
		this.options.push({
			type: "sub-command",
			...config,
			options: subCommandOptions,
		});
		return this as any;
	}

	addUserOption<const O extends Omit<UserOption, "type">>(
		config: O,
	): OptionsBuilder<[...T, Expand<O & { type: "user" }>]> {
		this.options.push({ type: "user", ...config });

		return this as any;
	}

	addAttachmentOption<const O extends Omit<AttachmentOption, "type">>(
		config: O,
	): OptionsBuilder<[...T, O & { type: "attachment" }]> {
		this.options.push({ type: "attachment", ...config });

		return this as any;
	}

	build(): T {
		return this.options;
	}
}
