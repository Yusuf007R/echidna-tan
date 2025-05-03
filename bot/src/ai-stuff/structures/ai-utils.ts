import { openRouterAPI } from "@Utils/request";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export class AiUtils {
	static async analyzeImageContent(imgBase64: string) {
		try {
			const response_format = z.object({
				description: z
					.string()
					.describe(
						"Detailed description of what's in the image, including the main subjects, setting, actions, and emotions, if there is text in the image, include it in the description be as detailed as possible",
					),
				emotions: z
					.array(z.string())
					.describe("Emotions or mood conveyed by the image"),
			});

			const completion = await openRouterAPI.beta.chat.completions.parse({
				model: "google/gemini-2.0-flash-001",
				messages: [
					{
						role: "user",
						content: [
							{
								type: "image_url",
								image_url: {
									url: imgBase64,
								},
							},
						],
					},
				],
				response_format: zodResponseFormat(response_format, "image_analysis"),
			});

			const image = completion.choices[0].message.parsed;

			return image;
		} catch (error) {
			console.error("Error processing images:", error);
			return null;
		}
	}
}
