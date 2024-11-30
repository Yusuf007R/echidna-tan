import "dotenv/config";

import type { InferSelectModel } from "drizzle-orm";
import type { userTable } from "./drizzle/schema";
import EchidnaClient from "./structures/echidna-client";
export const echidnaClient = new EchidnaClient();
export type User = InferSelectModel<typeof userTable>;
