import { AsyncResource } from 'node:async_hooks';
import { echidnaClient as client } from '..';
import EchidnaClient from './echidna-client';

export default class Base extends AsyncResource {
  echidna: EchidnaClient;
  private static _echidna?: EchidnaClient;

  constructor(clientstatic?: EchidnaClient) {
    super('Base');
    if (clientstatic) Base._echidna = clientstatic;
    this.echidna = Base._echidna || client;
  }

  static get echidna() {
    return Base._echidna || client;
  }

}
