export type CivitaiResponse = {
	token: string;
	jobs: CivitaiJob[];
};

export type CivitaiJob = {
	jobId: string;
	cost: number;
	result: PurpleResult;
	scheduled: boolean;
};

export type PurpleResult = {
	token: string;
	jobs: ResultJob[];
};

export type ResultJob = {
	jobId: string;
	cost: number;
	result: FluffyResult;
	scheduled: boolean;
};

export type FluffyResult = {
	blobKey: string;
	available: boolean;
	blobUrl: string;
	blobUrlExpirationDate: Date;
};
