import { getRouterManifest } from "@tanstack/start/router-manifest";
/// <reference types="vinxi/types/server" />
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/start/server";

import "~/env";
import { createRouter } from "./router";

export default createStartHandler({
	createRouter,
	getRouterManifest,
})(defaultStreamHandler);
