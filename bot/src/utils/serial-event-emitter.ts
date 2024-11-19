import { type DefaultEventMap, EventEmitter } from "tseep";

class SerialEventEmitter<
	EventMap extends DefaultEventMap = DefaultEventMap,
> extends EventEmitter<EventMap> {
	private queue: Map<keyof EventMap, any[][]>;
	private processing: Set<keyof EventMap>;

	constructor() {
		super();
		this.queue = new Map();
		this.processing = new Set();
	}

	emit = <EventKey extends keyof EventMap>(
		event: EventKey,
		...args: Parameters<EventMap[EventKey]>
	): boolean => {
		if (!this.queue.has(event)) {
			this.queue.set(event, []);
		}
		this.queue.get(event)?.push(args);
		this.processNext(event);
		return true;
	};

	private async processNext(eventName: keyof EventMap): Promise<void> {
		if (this.processing.has(eventName)) return;

		this.processing.add(eventName);

		while (this.queue.get(eventName)?.length) {
			const args = this.queue.get(eventName)?.shift()!;
			const listeners = this.listeners(eventName);

			for (const listener of listeners) {
				try {
					await listener(...args);
				} catch (error) {
					console.error(
						`Error in listener for event ${String(eventName)}:`,
						error,
					);
				}
			}
		}

		this.processing.delete(eventName);
	}

	queueSize(eventName: keyof EventMap): number {
		return this.queue.has(eventName)
			? (this.queue.get(eventName)?.length ?? 0)
			: 0;
	}

	clearQueue(eventName: keyof EventMap): void {
		if (this.queue.has(eventName)) {
			this.queue.set(eventName, []);
		}
	}
}

export default SerialEventEmitter;
