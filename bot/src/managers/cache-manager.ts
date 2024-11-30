import { LRUCache } from "lru-cache";

export default class CacheManager {
	private static _cache = new LRUCache({
		max: 500,
	});

	static TTL = {
		oneMinute: 60 * 1000, // 1 minute in ms
		fiveMinutes: 5 * 60 * 1000, // 5 minutes in ms
		tenMinutes: 10 * 60 * 1000, // 10 minutes in ms
		thirtyMinutes: 30 * 60 * 1000, // 30 minutes in ms
		oneHour: 60 * 60 * 1000, // 1 hour in ms
		oneDay: 24 * 60 * 60 * 1000, // 1 day in ms
	};

	static set: (typeof CacheManager._cache)["set"] = (...args) =>
		this._cache.set(...args);
	static get: (typeof CacheManager._cache)["get"] = (...args) =>
		this._cache.get(...args);
	static delete: (typeof CacheManager._cache)["delete"] = (...args) =>
		this._cache.delete(...args);
}
