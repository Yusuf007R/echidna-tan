import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import childProcess from "node:child_process";
import { readFileSync, readdirSync, watch } from "node:fs";
import { resolve } from "node:path";

const isProduction = process.env.NODE_ENV === "production";
const isWatch = process.argv.includes("watch");

// Cached TypeScript files lookup with memoization
let cachedFiles = null;
const getTypeScriptFiles = (dir) => {
	if (cachedFiles) return cachedFiles;

	const findFiles = (directory) => {
		const files = [];
		const items = readdirSync(directory, { withFileTypes: true });

		for (const item of items) {
			const path = `${directory}/${item.name}`;
			if (item.isDirectory()) {
				files.push(...findFiles(path));
			} else if (item.name.endsWith(".ts")) {
				files.push(path);
			}
		}
		return files;
	};

	cachedFiles = findFiles(dir);
	return cachedFiles;
};

// Load path aliases with error handling
const loadPathAlias = () => {
	try {
		const tsConfig = JSON.parse(readFileSync("./tsconfig.json", "utf-8"));
		const paths = tsConfig?.compilerOptions?.paths;

		if (!paths) {
			console.warn("No path aliases found in tsconfig.json");
			return {};
		}

		return Object.fromEntries(
			Object.entries(paths).map(([key, [value]]) => [
				key.split("/")[0],
				resolve(value.replace("*", "")),
			]),
		);
	} catch (error) {
		console.error("Failed to load path aliases:", error);
		return {};
	}
};

/** @type {import('esbuild').BuildOptions} */
const config = {
	entryPoints: getTypeScriptFiles("./src"),
	bundle: true,
	platform: "node",
	target: "node23",
	outdir: "dist",
	sourcemap: true,
	minify: isProduction,
	format: "esm",
	splitting: true,
	plugins: [nodeExternalsPlugin()],
	alias: loadPathAlias(),
	outbase: "src",
	loader: {
		".ts": "ts",
	},
};

// Debounce function
const debounce = (fn, delay) => {
	let timeoutId;
	return (...args) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
};

const clearScreen = () => process.stdout.write("\x1B[2J\x1B[3J\x1B[H");

async function build() {
	try {
		if (isWatch) {
			clearScreen();
			let nodeProcess = null;

			const startNodeProcess = () => {
				nodeProcess?.kill();
				nodeProcess = childProcess.spawn(
					"node",
					["--enable-source-maps", "--trace-deprecation", "./dist/index.js"],
					{
						stdio: "inherit",
						// Add proper error handling for child process
						env: { ...process.env, FORCE_COLOR: "1" },
					},
				);

				nodeProcess.on("error", (error) => {
					console.error("Failed to start Node.js process:", error);
				});
			};

			const rebuildAndRestart = debounce(async () => {
				try {
					clearScreen();
					cachedFiles = null; // Clear cache to detect new files
					config.entryPoints = getTypeScriptFiles("./src");
					config.alias = loadPathAlias();
					await esbuild.build(config);
					console.log("Build completed");
					startNodeProcess();
				} catch (error) {
					console.error("Build failed:", error);
				}
			}, 100);

			await esbuild.build(config);
			startNodeProcess();

			const watcher = watch("./src", { recursive: true }, (eventType) => {
				if (eventType === "change") {
					rebuildAndRestart();
				}
			});

			// Proper cleanup
			const cleanup = () => {
				watcher.close();
				nodeProcess?.kill();
				process.exit(0);
			};

			process.on("SIGTERM", cleanup);
			process.on("SIGINT", cleanup);
		} else {
			await esbuild.build(config);
			console.log("Build complete");
		}
	} catch (err) {
		console.error("Build failed:", err);
		process.exit(1);
	}
}

build();
