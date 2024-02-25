import EchidnaClient from './echidna-client';

export default class EchidnaSingleton {
  echidna: EchidnaClient;
  private static _echidna?: EchidnaClient;

  constructor(clientstatic?: EchidnaClient) {
    if (clientstatic) EchidnaSingleton._echidna = clientstatic;
    this.echidna = EchidnaSingleton._echidna!;
  }

  static get echidna() {
    if (!EchidnaSingleton._echidna)
      throw new Error('Echidna client is not initialized');
    return EchidnaSingleton._echidna;
  }
}
