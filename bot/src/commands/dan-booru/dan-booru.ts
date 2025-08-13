import { Command } from "@Structures/command";
import DanBooru from "@Structures/dan-booru";
import { InteractionContext } from "@Structures/interaction-context";
import { OptionsBuilder } from "@Utils/options-builder";

const options = new OptionsBuilder()
	.addStringOption({
		name: "tags",
		description: "Tags to search for",
	})
	.addIntOption({
		name: "post-id",
		description: "Post ID to search for",
	})
	.addBoolOption({
		name: "nsfw",
		description: "Whether to search for NSFW posts",
	})
	.build();

export default class DanbooruCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "dan-booru",
			description: "Dan booru commands",
			cmdType: "BOTH",
			options,
		});
	}

	async run() {
		const danbooru = new DanBooru();
		await InteractionContext.deferReply();
		const tags = this.options.tags;
		const postId = this.options["post-id"];
		const nsfw = this.options.nsfw;
		if (nsfw && !danbooru.isNsfwAlowed()) {
			await InteractionContext.editReply("NSFW is not allowed in this channel.");
			return;
		}
		try {
			if (tags) {
				const post = await danbooru.querySinglePost({
					tags: tags.split(" "),
					nsfw: !!nsfw,
				});
				await danbooru.sendMessage(post);
				return;
			}
			if (postId) {
				const post = await danbooru.getPostById(postId);
				await danbooru.sendMessage(post);
				return;
			}
		} catch (error: any) {
			await InteractionContext.editReply(
				error.message ?? "Internal error, try again later.",
			);
			console.log(error);
			return;
		}
		const post = await danbooru.querySinglePost({
			tags: ["order:rank"],
			nsfw: !!nsfw,
		});
		await danbooru.sendMessage(post);
	}
}
