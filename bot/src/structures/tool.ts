import { zodFunction } from "openai/helpers/zod.mjs";
import type { z } from "zod";
import EchidnaSingleton from "./echidna-singleton";

export type ToolConfigs<
	S extends z.ZodObject<any, any> = z.ZodObject<any, any>,
> = {
	name: string;
	description: string;
	schema: S;
	isAsync: boolean;
};

export type ToolStatus = "processing" | "completed" | "failed" | "idle";

// Define result types for different kinds of tool returns
export type ToolFileResult = {
	type: "file";
	filename: string;
	data: any;
	mimeType?: string;
	systemPrompt?: string;
};

export type ToolImageResult = {
	type: "image";
	url: string;
	caption?: string;
	systemPrompt?: string;
};

export type ToolTextResult = {
	type: "text";
	content: string;
	systemPrompt?: string;
};

export type ToolErrorResult = {
	type: "error";
	error: Error;
	systemPrompt?: string;
};

export type ToolResult =
	| ToolFileResult
	| ToolImageResult
	| ToolTextResult
	| ToolErrorResult;

export abstract class Tool<
	S extends z.ZodObject<any, any> = z.ZodObject<any, any>,
> extends EchidnaSingleton {
	readonly name: string;
	readonly description: string;
	readonly schema: S;
	private _status: ToolStatus = "idle";
	readonly isAsync: boolean;
	private _isCancelled = false;

	get status(): ToolStatus {
		return this._status;
	}

	constructor(readonly configs: ToolConfigs<S>) {
		super();
		this.name = configs.name;
		this.description = configs.description;
		this.schema = configs.schema;
		this.isAsync = configs.isAsync;
	}

	/**
	 * Abstract method that must be implemented by all tools
	 * @param params Parameters for the tool execution
	 */
	abstract run(params: z.infer<S>): Promise<ToolResult>;

	/**
	 * Cancel the tool execution if it's running
	 */
	cancel(): void {
		this._isCancelled = true;
		this._status = "idle";
	}

	/**
	 * Check if the tool execution has been cancelled
	 */
	get isCancelled(): boolean {
		return this._isCancelled;
	}

	/**
	 * Set the tool status
	 */
	protected setStatus(status: ToolStatus): void {
		this._status = status;
	}

	/**
	 * Helper method to create a file result
	 */
	protected createFileResult(
		filename: string,
		data: any,
		mimeType?: string,
		systemPrompt?: string,
	): ToolFileResult {
		return {
			type: "file",
			filename,
			data,
			mimeType,
			systemPrompt,
		};
	}

	/**
	 * Helper method to create an image result
	 */
	protected createImageResult(
		url: string,
		caption?: string,
		systemPrompt?: string,
	): ToolImageResult {
		return {
			type: "image",
			url,
			caption,
			systemPrompt,
		};
	}

	/**
	 * Helper method to create a text result
	 */
	protected createTextResult(
		content: string,
		systemPrompt?: string,
	): ToolTextResult {
		return {
			type: "text",
			content,
			systemPrompt,
		};
	}

	/**
	 * Helper method to create an error result
	 */
	protected createErrorResult(
		error: Error,
		systemPrompt?: string,
	): ToolErrorResult {
		return {
			type: "error",
			error,
			systemPrompt,
		};
	}

	toJSON() {
		return zodFunction({
			name: this.name,
			parameters: this.schema,
			description: this.description,
		});
	}
}
