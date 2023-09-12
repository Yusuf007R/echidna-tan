import {APIUser, REST, Routes} from 'discord.js';
import EchidnaSingleton from './echidna-singleton';

export default class DiscordAPI extends EchidnaSingleton {
  private _token: string | null = null;
  constructor() {
    super();
  }

  async getUserInfo(userId?: string) {
    if (!this._token) throw new Error('No token provided');
    return (await new REST()
      .setToken(this._token)
      .get(Routes.user(userId))) as APIUser;
  }

  get token() {
    return this._token;
  }

  setToken(token: string | null) {
    this._token = token;
    return this;
  }
}
