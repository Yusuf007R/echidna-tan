import WaifuGenerator from "@AiStructures/waifu-generator";
import { Tool } from "@Structures/tool";
import { z } from "zod";

const schema = z.object({
	prompt: z.string().describe("A list of danbooru tags"),
});

export default class EchidnaSelfieTool extends Tool<typeof schema> {
	constructor() {
		super({
			name: "echidna-selfie",
			description:
				"Generate a selfie of an echidna, make a prompt using danbooru tags, example: '1girl, selfie, from above, looking at the camera'",
			schema,
			isAsync: true,
		});
	}

	async run(params: z.infer<typeof schema>) {
		console.log(`Generating echidna selfie with prompt: ${params.prompt}`);
		const { prompt } = params;
		const image = await WaifuGenerator.getCivitaiImage(prompt);
		console.log(image);
		return image;
	}
}
