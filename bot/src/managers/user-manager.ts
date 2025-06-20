import config from "@Configs";
import EchidnaSingleton from "@Structures/echidna-singleton";
import { eq } from "drizzle-orm";
import db from "../drizzle";
import { userTable } from "../drizzle/schema";

export class UserManager {
	/**
	 * Get a user by their Discord ID. If the user doesn't exist, they will be created.
	 * @param discordId The Discord ID of the user
	 * @param displayName The display name of the user
	 * @param userName The username of the user
	 * @returns The user object
	 */
	static async getOrCreateUser(discordId: string) {
		// Try to find the user
		const existingUser = await db
			.select()
			.from(userTable)
			.where(eq(userTable.id, discordId))
			.get();

		if (existingUser) {
			return existingUser;
		}

		const discordUser = await UserManager.getDiscordUser(discordId);
		if (!discordUser) throw new Error("Discord user not found");
		// If user doesn't exist, create them
		console.log("Creating new user");
		const [newUser] = await db
			.insert(userTable)
			.values({
				id: discordId,
				displayName: discordUser.displayName,
				userName: discordUser.username,
				isAdmin: discordId === config.DISCORD_OWNER_ID,
			})
			.returning();
		console.log(newUser);

		return newUser;
	}

	/**
	 * Get a user by their Discord ID without creating them if they don't exist.
	 * @param discordId The Discord ID of the user
	 * @returns The user object or null if not found
	 */
	static async getUser(discordId: string) {
		return await db
			.select()
			.from(userTable)
			.where(eq(userTable.id, discordId))
			.get();
	}

	/**
	 * Update a user's information
	 * @param discordId The Discord ID of the user
	 * @param data The data to update
	 * @returns The updated user object
	 */
	static async updateUser(
		discordId: string,
		data: Partial<typeof userTable.$inferInsert>,
	) {
		const [updatedUser] = await db
			.update(userTable)
			.set(data)
			.where(eq(userTable.id, discordId))
			.returning();

		return updatedUser;
	}

	static async getDiscordUser(discordId: string) {
		return await EchidnaSingleton.echidna.users.fetch(discordId);
	}
}
