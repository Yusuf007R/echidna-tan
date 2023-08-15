import EchidnaClient from './echidna-client';

export default class Base {
  private static _echidna: EchidnaClient;
  echidna: EchidnaClient;

  constructor() {
    this.echidna = Base._echidna;
  }

  static setClient(client: EchidnaClient) {
    this._echidna = client;
  }
}
