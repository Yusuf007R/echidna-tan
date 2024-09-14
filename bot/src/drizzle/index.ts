import config from '@Configs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

const client = new Client({
  connectionString: config.DATABASE_URL
});

const getDB = async () => {
  await client.connect();
  return drizzle(client);
};

export default getDB;
