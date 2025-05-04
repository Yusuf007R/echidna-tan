import EchidnaSingleton from "@Structures/echidna-singleton";
import type { ModalSubmitInteraction } from "discord.js";
import { EventEmitter } from "tseep";
import CacheManager from "./cache-manager";

class ModalManager extends EchidnaSingleton {
	eventEmitter = new EventEmitter();

	waitForModalResponse(
		id: string,
		timeout = CacheManager.TTL.oneMinute,
	): Promise<ModalSubmitInteraction> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error("Modal response timed out"));
			}, timeout);
			this.eventEmitter.once(id, (data) => {
				clearTimeout(timer);
				resolve(data);
			});
		});
	}

	processModalResponse(data: ModalSubmitInteraction) {
		this.eventEmitter.emit(data.customId, data);
	}
}

export default ModalManager;
