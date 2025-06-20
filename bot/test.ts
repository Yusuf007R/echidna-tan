import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { YtDlp } from "ytdlp-nodejs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMP_DIR = path.join(__dirname, "temp", "ytdlp");
const ytdlp = new YtDlp();

async function downloadVideo() {
	// Ensure the temp directory exists
	await mkdir(TEMP_DIR, { recursive: true });

	const filePath = path.join(TEMP_DIR, `${"MP3WhIB9mQg"}.opus`);
	const stream = createWriteStream(filePath);
	const ytdlpStream = ytdlp.stream(
		"https://www.youtube.com/watch?v=MP3WhIB9mQg",
		{
			format: {
				filter: "audioonly",
				type: "opus",
				quality: 10,
			},
			onProgress: (progress) => {
				console.log(progress);
			},
		},
	);
	await ytdlpStream.pipeAsync(stream);
	console.log("Downloaded", filePath);
	return filePath;
}

downloadVideo().catch(console.error);
