import type { Env } from "hono";
import type { Expand } from "./utils";

export type MergeHono<T extends Env, U extends Env> = {
	Bindings: Expand<T["Bindings"] & U["Bindings"]>;
	Variables: Expand<T["Variables"] & U["Variables"]>;
};
