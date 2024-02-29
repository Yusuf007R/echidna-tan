import { CommandValidator } from './command-validator';

type eventOptionsConfig = {
  validators?: Array<new () => CommandValidator>;
  // preRunners?: Array<new () => CommandPreRunner>;
};
export default class EventOptions {
  validators: Array<new () => CommandValidator>;

  constructor(configs: eventOptionsConfig) {
    this.validators = configs.validators ?? [];
    // this.preRunners = configs.preRunners ?? [];
  }
}
