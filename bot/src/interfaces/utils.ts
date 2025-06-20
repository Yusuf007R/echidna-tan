export type PickMatching<T, V> = {
	[K in keyof T as T[K] extends V ? K : never]: T[K];
};

export type ExtractMethods<T> = PickMatching<T, (...args: any[]) => void>;

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type Constructor<T> = new (...args: any[]) => T;
