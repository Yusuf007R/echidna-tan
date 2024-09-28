import config from '@Configs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const queryClient = postgres(config.DATABASE_URL);

const db = drizzle(queryClient, { schema });

export default db;
