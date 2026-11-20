import { errorMessage as buildErrorMessage } from "../build/messages.ts";
import type { DiffError } from "./errors.ts";

export const errorMessage = (error: DiffError): string => {
	if (error._tag === "TargetMissingError") {
		return `[ERROR] diff: target folder ${error.folder} does not exist`;
	}
	if (error._tag === "SelectorNotFoundError") {
		return `[ERROR] diff: --${error.kind} ${JSON.stringify(error.name)} matched no files`;
	}
	return buildErrorMessage(error).replaceAll(/^\[ERROR\] build:/gmu, "[ERROR] diff:");
};
