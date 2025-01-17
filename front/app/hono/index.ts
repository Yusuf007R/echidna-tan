import type { AppType } from "@Echidna-API";
import { hc } from "hono/client";
import { env } from "~/env";
import getServerHeaders from "~/utils/get-server-headers";

const isBrowser = typeof window !== "undefined";

const honoClient = hc<AppType>(env.VITE_API_URL, {
	fetch: async (input, requestInit, _, __) => {
		const reqInit = requestInit ?? {};
		if (!isBrowser) reqInit.headers = (await getServerHeaders()) as HeadersInit;
		return fetch(input, reqInit);
	},
	init: {
		credentials: "include",
	},
});

export default honoClient;
