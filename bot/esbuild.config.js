import * as esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const isProduction = process.env.NODE_ENV === "production";
const isWatch = process.argv.includes("watch");

// Get all TypeScript files recursively
const getTypeScriptFiles = (dir) => {
	let files = [];
	const items = readdirSync(dir, { withFileTypes: true });

	for (const item of items) {
		if (item.isDirectory()) {
			files = [...files, ...getTypeScriptFiles(`${dir}/${item.name}`)];
		} else if (item.name.endsWith(".ts")) {
			files.push(`${dir}/${item.name}`);
		}
	}

	return files;
};

const sourceFiles = getTypeScriptFiles("./src");

const loadPathAlias = () => {
	const {
		compilerOptions: { paths },
	} = JSON.parse(readFileSync("./tsconfig.json", "utf-8"));
	return Object.fromEntries(
		Object.entries(paths).map(([key, [value]]) => [
			key.split("/")[0],
			resolve(value.replace("*", "")),
		]),
	);
};

/** @type {import('esbuild').BuildOptions} */
const config = {
	entryPoints: sourceFiles,
	bundle: true,
	platform: "node",
	target: "node20",
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

try {
	if (isWatch) {
		await esbuild
			.context(config)
			.then((ctx) => {
				ctx.watch();
				// Add an initial build event
				ctx.rebuild().then(() => {
					console.log("Initial build complete - starting watch...");
				});
			})
			.catch(() => process.exit(1));
	} else {
		await esbuild.build(config);
		console.log("Build complete");
	}
} catch (err) {
	console.error("Build failed:", err);
	process.exit(1);
}
