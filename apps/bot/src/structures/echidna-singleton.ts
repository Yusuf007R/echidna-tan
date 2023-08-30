import {AsyncResource} from 'node:async_hooks';
import EchidnaClient from './echidna-client';

export default class EchidnaSingleton extends AsyncResource {
  echidna: EchidnaClient;
  private static _echidna?: EchidnaClient;

  constructor(clientstatic?: EchidnaClient) {
    super('Base');
    if (clientstatic) EchidnaSingleton._echidna = clientstatic;
    this.echidna = EchidnaSingleton._echidna!;
  }

  static get echidna() {
    if (!EchidnaSingleton._echidna)
      throw new Error('Echidna client is not initialized');
    return EchidnaSingleton._echidna;
  }
}
