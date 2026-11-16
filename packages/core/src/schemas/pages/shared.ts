import { Array, String, optionalKey } from "effect/Schema";

export const PagesMetadataFields = {
	pageOrder: optionalKey(Array(String)),
	activePageName: optionalKey(String),
};
