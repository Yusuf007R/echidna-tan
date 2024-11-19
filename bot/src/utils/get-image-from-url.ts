import { baseAPI } from "./request";

export default async function getImageAsBuffer(url: string) {
	return await baseAPI.get<Buffer>(
		url,
		{},
		{
			responseType: "arraybuffer",
		},
	);
}
