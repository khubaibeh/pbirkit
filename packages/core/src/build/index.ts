import { Option } from "effect";

import type { Config } from "../config.ts";
import { modelFiles, modelOf, modelOwnedFolders } from "./model.ts";
import { reportFiles, reportFolder, reportOwnedFolders } from "./report.ts";
import type { BuildFile } from "./shared.ts";

export { formatNumber, toJson } from "./json.ts";
export { modelCache } from "./model.ts";
export type { ModelCache } from "./model.ts";
export { reportFolder } from "./report.ts";
export type { BuildFile } from "./shared.ts";

const GITIGNORE: BuildFile = {
	path: ".gitignore",
	content: "**/.pbi/localSettings.json\r\n**/.pbi/cache.abf",
};

export const reportDefinitionFolder = (config: Config): string => `${reportFolder(config)}/definition`;

export const ownedFolders = (config: Config): ReadonlyArray<string> => [
	...reportOwnedFolders(config),
	...Option.match(modelOf(config), { onNone: () => [], onSome: modelOwnedFolders }),
];

export const buildFiles = (config: Config): ReadonlyArray<BuildFile> => [
	...reportFiles(config),
	GITIGNORE,
	...Option.match(modelOf(config), { onNone: () => [], onSome: modelFiles }),
];
