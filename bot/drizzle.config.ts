

import config from "@Configs";
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/drizzle/schema.ts",
  out: "./migrations",
  dialect: "turso",
  dbCredentials: {
    url: config.TURSO_DATABASE_URL,
    authToken: config.TURSO_AUTH_TOKEN,
  },
} satisfies Config;