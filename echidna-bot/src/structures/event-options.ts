import {EventValidator} from './event-validator';

type eventOptionsConfig = {
  validators?: Array<new () => EventValidator>;
  // preRunners?: Array<new () => CommandPreRunner>;
};
export default class EventOptions {
  validators: Array<new () => EventValidator>;

  constructor(configs: eventOptionsConfig) {
    this.validators = configs.validators ?? [];
    // this.preRunners = configs.preRunners ?? [];
  }
}
