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
	const ignore = ["jikan4.js", "discord-voip"];
	if (ignore.some((i) => error.stack?.includes(i))) {
		return;
	}
	console.log("[WARNING]", error, error.stack);
});

process.on("exit", (code) => {
	console.log("[EXIT]", code);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
	console.log("[SIGTERM] Received SIGTERM, shutting down gracefully...");
	void gracefulShutdown();
});

process.on("SIGINT", () => {
	console.log("[SIGINT] Received SIGINT, shutting down gracefully...");
	void gracefulShutdown();
});

async function gracefulShutdown() {
	try {
		console.log("[SHUTDOWN] Starting graceful shutdown...");

		// Destroy Discord client connection
		if (echidnaClient.isReady()) {
			console.log("[SHUTDOWN] Destroying Discord client...");
			await echidnaClient.destroy();
		}

		console.log("[SHUTDOWN] Graceful shutdown completed");
		process.exit(0);
	} catch (error) {
		console.error("[SHUTDOWN] Error during graceful shutdown:", error);
		process.exit(1);
	}
}
