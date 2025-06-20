import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const filename = fileURLToPath(import.meta.url);
export const baseDir = dirname(filename);
