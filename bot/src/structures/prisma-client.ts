import { PrismaClient } from '@prisma/client';
import EchidnaClient from './echidna-client';

export default class PrismaSingleton extends EchidnaClient {
  private static _db: PrismaClient;
  constructor() {
    super();
  }

  static get db() {
    if (!PrismaSingleton._db) PrismaSingleton._db = new PrismaClient();
    return PrismaSingleton._db;
  }
}
