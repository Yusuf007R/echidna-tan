import { createEnv } from "@t3-oss/env-core";

import { z } from "zod";

export const env = createEnv({
	clientPrefix: "VITE_",
	server: {},
	client: {
		VITE_API_URL: z.string().url(),
	},
	runtimeEnv: import.meta.env,
});
