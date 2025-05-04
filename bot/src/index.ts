import "dotenv/config";

import EchidnaClient from "./structures/echidna-client";

export const echidnaClient = new EchidnaClient();

process.on("unhandledRejection", (reason, promise) => {
	console.log(
		"[UNHANDLED REJECTION]",
		promise,
		reason,
		reason instanceof Error ? reason.stack : null,
	);
});

process.on("uncaughtException", (error) => {
	console.log("[UNCAUGHT EXCEPTION]", error, error.stack);
});

process.removeAllListeners("warning").on("warning", (error) => {
	if (error.stack?.includes("jikan4.js")) {
		return;
	}
	console.log("[WARNING]", error, error.stack);
});

process.on("exit", (code) => {
	console.log("[EXIT]", code);
});
