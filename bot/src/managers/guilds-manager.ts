import EchidnaSingleton from "@Structures/echidna-singleton";

import { Collection, type Guild, type GuildMember } from "discord.js";
import CacheManager from "./cache-manager";

type CacheManagerGuild = {
	guild: Guild;
	members: Collection<string, GuildMember>;
};

export default class GuildsManager extends EchidnaSingleton {
	async getGuilds() {
		const key = "echidna-guilds";
		const cached = CacheManager.get(key);

		if (cached) return cached as Collection<string, CacheManagerGuild>;

		const guilds = await this.echidna.guilds.fetch();

		const cacheCollection = new Collection<string, CacheManagerGuild>();

		await Promise.all(
			guilds.map(async (oAuthGuild) => {
				const guild = await this.echidna.guilds.fetch(oAuthGuild.id);

				const members = await guild.members.fetch();

				cacheCollection.set(oAuthGuild.id, {
					guild,
					members,
				});
			}),
		);

		CacheManager.set(key, cacheCollection, {
			ttl: CacheManager.TTL.thirtyMinutes,
		});
		return cacheCollection;
	}

	async getGuildByID(id: string) {
		const guilds = await this.getGuilds();
		return guilds.get(id);
	}

	async getGuildsByMemberID(memberID: string) {
		const guilds = await this.getGuilds();
		return guilds.filter((g) => g.members.has(memberID));
	}
}
