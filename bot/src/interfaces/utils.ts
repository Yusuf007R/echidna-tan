export type PickMatching<T, V> = {
	[K in keyof T as T[K] extends V ? K : never]: T[K];
};

export type ExtractMethods<T> = PickMatching<T, (...args: any[]) => void>;
