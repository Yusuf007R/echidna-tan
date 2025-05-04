import type { Message } from "discord.js";

export const extractImageFromMsg = (message: Message): string[] => {
	const imageUrls: string[] = [];

	// Extract URLs from attachments
	for (const attachment of message.attachments.values()) {
		if (attachment.contentType?.startsWith("image/")) {
			imageUrls.push(attachment.url);
		}
	}

	// Extract URLs from embeds
	for (const embed of message.embeds) {
		// Check thumbnail
		if (embed.thumbnail?.url) {
			imageUrls.push(embed.thumbnail.url);
		}
		// Check image
		if (embed.image?.url) {
			imageUrls.push(embed.image.url);
		}
	}

	return imageUrls;
};
