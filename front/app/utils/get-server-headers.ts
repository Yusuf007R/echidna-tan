import { createServerFn } from "@tanstack/start";

import { getHeaders } from "vinxi/http";

const getServerHeaders = createServerFn().handler(async () => {
	return getHeaders();
});

export default getServerHeaders;
