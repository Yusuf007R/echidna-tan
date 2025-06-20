import type EchidnaClient from "./echidna-client";

export default class EchidnaSingleton {
	echidna: EchidnaClient;
	private static _echidna?: EchidnaClient;

	constructor(clientstatic?: EchidnaClient) {
		if (clientstatic) EchidnaSingleton._echidna = clientstatic;
		this.echidna = EchidnaSingleton._echidna!;
	}

	static get echidnaId() {
		if (!EchidnaSingleton._echidna || !EchidnaSingleton._echidna.user)
			throw new Error("Echidna client is not initialized");
		return EchidnaSingleton._echidna.user.id;
	}

	static get echidna() {
		if (!EchidnaSingleton._echidna)
			throw new Error("Echidna client is not initialized");
		return EchidnaSingleton._echidna;
	}
}
