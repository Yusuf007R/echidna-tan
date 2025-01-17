import sharp from "sharp";
import getImageAsBuffer from "./get-image-from-url";

export default async function getImageColor(
	image: string,
): Promise<[number, number, number]> {
	const res = await getImageAsBuffer(image);
	if (res?.ok && res.data) {
		const { dominant } = await sharp(res.data).stats();
		return Object.values(dominant) as [number, number, number];
	}
	return [0, 0, 0];
}
