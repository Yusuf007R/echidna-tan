// make a command that sends a message to a specific user

import config from "@Configs";
import IsAdmin from "@EventsValidators/isAdmin";
import { Command } from "@Structures/command";
import getImageAsBuffer from "@Utils/get-image-from-url";
import { OptionsBuilder } from "@Utils/options-builder";
import { ActivityType, type ChatInputCommandInteraction } from "discord.js";
import { type InferInsertModel, eq } from "drizzle-orm";
import db from "src/drizzle";
import { echidnaStatus, echidnaTable } from "src/drizzle/schema";

const activityTypeValues = Object.entries(ActivityType)
	.filter(([key, value]) => typeof value === "number")
	.map(([key, value]) => ({
		name: key,
		value: value,
	}));

const options = new OptionsBuilder()
	.addStringOption({
		name: "name",
		description: "The name of the echidna",
	})
	.addStringOption({
		name: "activity-type",
		description: "The activity type of the echidna",
		choices: activityTypeValues.map(({ name }) => name),
	})
	.addStringOption({
		name: "status",
		description: "The status of the echidna",
		choices: echidnaStatus,
	})
	.addStringOption({
		name: "activity-message",
		description: "The activity message of the echidna",
	})
	.addAttachmentOption({
		name: "avatar",
		description: "The profile picture of the echidna",
	})
	.addStringOption({
		name: "status-message",
		description: "The status message of the echidna",
	})
	.build();

export default class EditEchidnaCommand extends Command<typeof options> {
	constructor() {
		super({
			name: "edit-echidna",
			description: `Edit the Echidna's settings`,
			options,
			validators: [IsAdmin],
			cmdType: "BOTH",
		});
	}

	async run(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const name = this.options.name;
		const activityType = this.options["activity-type"];
		const activityMessage = this.options["activity-message"];
		const avatar = this.options.avatar;
		const statusMessage = this.options["status-message"];
		const status = this.options.status;
		if (name) {
			this.echidna.user?.setUsername(name);
		}
		if (avatar) {
			if (
				!["image/jpeg", "image/png", "image/jpg"].includes(
					avatar.contentType ?? "",
				)
			) {
				interaction.editReply("Invalid image type");
				return;
			}
			const res = await getImageAsBuffer(avatar.url);
			if (res.ok && res.data) this.echidna.user?.setAvatar(res.data);
		}

		const dbBody: Partial<InferInsertModel<typeof echidnaTable>> = {};

		if (activityType) {
			const activityTypeValue = activityTypeValues.find(
				({ name }) => name === activityType,
			)?.value;
			if (activityTypeValue) dbBody.activityType = activityTypeValue as number;
		}
		if (activityMessage) dbBody.activity = activityMessage;
		if (statusMessage) dbBody.state = statusMessage;
		if (status) dbBody.status = status as (typeof echidnaStatus)[number];

		if (Object.keys(dbBody).length) {
			await db
				.update(echidnaTable)
				.set(dbBody)
				.where(eq(echidnaTable.id, config.DISCORD_DB_PROFILE));
		}

		await this.echidna.updateEchidna();
		interaction.editReply("Echidna updated");
	}
}
