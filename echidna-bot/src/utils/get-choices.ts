import { CacheType, CommandInteraction } from 'discord.js';

class GetChoices {
  private options: CommandInteraction<CacheType>['options'];

  constructor(opt: CommandInteraction<CacheType>['options']) {
    this.options = opt;
  }

  private get(key: string, required = false) {
    const option = this.options.get(key);
    if(required){
      if (!option) throw new Error(`Missing option ${key}`);
      if (!option.value && option.value !== 0)
        throw new Error(`Missing value for option ${key}`);

      return option.value;
    }
    return option?.value;
  }

  getString(key: string, required = false) {
    const option = this.get(key, required);
    if (option !== undefined && typeof option !== 'string')
      throw new Error(`Option ${key} is not a string`);
    return option;
  }

  getNumber(key: string, required = false) {
    const option = this.get(key, required);
    if (option !== undefined && typeof option !== 'number')
      throw new Error(`Option ${key} is not a number`);
    return option;
  }

  getBoolean(key: string, required = false) {
    const option = this.get(key, required);
    if (option !== undefined && typeof option !== 'boolean')
      throw new Error(`Option ${key} is not a boolean`);
    return option;
  }
}

export default GetChoices;
