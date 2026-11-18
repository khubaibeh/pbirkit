import { Option } from "effect";

import type { Config } from "../config.ts";
import { modelFiles, modelFolder, modelOf } from "./model.ts";
import { reportFiles } from "./report.ts";
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

export const modelFolderOf = (config: Config): Option.Option<string> =>
	Option.map(modelOf(config), modelFolder);

export const buildFiles = (config: Config): ReadonlyArray<BuildFile> => [
	...reportFiles(config),
	GITIGNORE,
	...Option.match(modelOf(config), { onNone: () => [], onSome: modelFiles }),
];
