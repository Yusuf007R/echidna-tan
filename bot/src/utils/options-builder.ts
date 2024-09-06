export type Option =
  | {
      type: 'string';
      name: string;
      description: string;
      required?: boolean;
      choices?: string[];
      autocomplete?: boolean;
    }
  | {
      type: 'bool';
      name: string;
      description: string;
      required?: boolean;
    }
  | {
      type: 'int';
      name: string;
      description: string;
      required?: boolean;
      min?: number;
      max?: number;
    }
  | {
      type: 'sub-command';
      name: string;
      description: string;
      options?: Option[];
    }
  | {
      type: 'user';
      name: string;
      description: string;
      required?: boolean;
    }
  | {
      type: 'attachment';
      name: string;
      description: string;
      required?: boolean;
    };

type SubCommandOptions = Exclude<Option, { type: 'sub-command' }>;

export class SubCommandOptionsBuilder<T extends SubCommandOptions[] = []> {
  private options: T = [] as unknown as T;

  addStringOption(config: Omit<Extract<SubCommandOptions, { type: 'string' }>, 'type'>) {
    this.options.push({ type: 'string', ...config } as SubCommandOptions);
    return this as unknown as SubCommandOptionsBuilder<[...T, Extract<SubCommandOptions, { type: 'string' }>]>;
  }

  addBoolOption(config: Omit<Extract<SubCommandOptions, { type: 'bool' }>, 'type'>) {
    this.options.push({ type: 'bool', ...config } as SubCommandOptions);
    return this as unknown as SubCommandOptionsBuilder<[...T, Extract<SubCommandOptions, { type: 'bool' }>]>;
  }

  addIntOption(config: Omit<Extract<SubCommandOptions, { type: 'int' }>, 'type'>) {
    this.options.push({ type: 'int', ...config } as SubCommandOptions);
    return this as unknown as SubCommandOptionsBuilder<[...T, Extract<SubCommandOptions, { type: 'int' }>]>;
  }

  addUserOption(config: Omit<Extract<SubCommandOptions, { type: 'user' }>, 'type'>) {
    this.options.push({ type: 'user', ...config } as SubCommandOptions);
    return this as unknown as SubCommandOptionsBuilder<[...T, Extract<SubCommandOptions, { type: 'user' }>]>;
  }

  addAttachmentOption(config: Omit<Extract<SubCommandOptions, { type: 'attachment' }>, 'type'>) {
    this.options.push({ type: 'attachment', ...config } as SubCommandOptions);
    return this as unknown as SubCommandOptionsBuilder<[...T, Extract<SubCommandOptions, { type: 'attachment' }>]>;
  }

  build(): T {
    return this.options;
  }
}

export class OptionsBuilder<T extends Option[] = []> {
  private options: T = [] as unknown as T;

  addStringOption(config: Omit<Extract<Option, { type: 'string' }>, 'type'>) {
    this.options.push({ type: 'string', ...config } as Option);
    return this as unknown as OptionsBuilder<[...T, Extract<Option, { type: 'string' }>]>;
  }

  addBoolOption(config: Omit<Extract<Option, { type: 'bool' }>, 'type'>) {
    this.options.push({ type: 'bool', ...config } as Option);
    return this as unknown as OptionsBuilder<[...T, Extract<Option, { type: 'bool' }>]>;
  }

  addIntOption(config: Omit<Extract<Option, { type: 'int' }>, 'type'>) {
    this.options.push({ type: 'int', ...config } as Option);
    return this as unknown as OptionsBuilder<[...T, Extract<Option, { type: 'int' }>]>;
  }

  addSubCommandOption<S extends SubCommandOptions[]>(
    config: Omit<Extract<Option, { type: 'sub-command' }>, 'type' | 'options'>,
    optionsBuilder: (builder: SubCommandOptionsBuilder) => SubCommandOptionsBuilder<S>
  ) {
    const subCommandOptions = optionsBuilder(new SubCommandOptionsBuilder()).build();
    this.options.push({
      type: 'sub-command',
      ...config,
      options: subCommandOptions
    } as Option);
    return this as unknown as OptionsBuilder<
      [...T, { type: 'sub-command'; name: string; description: string; options: S }]
    >;
  }

  addUserOption(config: Omit<Extract<Option, { type: 'user' }>, 'type'>) {
    this.options.push({ type: 'user', ...config } as Option);
    return this as unknown as OptionsBuilder<[...T, Extract<Option, { type: 'user' }>]>;
  }

  addAttachmentOption(config: Omit<Extract<Option, { type: 'attachment' }>, 'type'>) {
    this.options.push({ type: 'attachment', ...config } as Option);
    return this as unknown as OptionsBuilder<[...T, Extract<Option, { type: 'attachment' }>]>;
  }

  build(): T {
    return this.options;
  }
}
