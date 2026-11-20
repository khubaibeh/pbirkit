import { Console, Effect, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { reportTree } from "@pbirkit/core/tree";

import { readConfig } from "../build/config.ts";
import type { ConfigLoadError, ConfigShapeError } from "../build/errors.ts";
import { errorMessage, treeMessage } from "./messages.ts";

const HELP = [
	"List the pages, visuals and bookmarks of the project as a tree.",
	"",
	"The first line counts the pages, visuals and bookmarks.",
	"Each later line has this form:",
	"",
	"  <type> (<subtype>, <id>, <name>)",
	"",
	"  type      page, visual, group or bookmark",
	"  subtype   page: tooltip or drillthrough",
	"            visual: the visual type, for example barChart",
	"  id        the name in the PBIP files; config fields and links use it",
	"  name      page and bookmark: the display name",
	"            visual: the title text",
	"            group: the group name",
	"",
	'A "-" marks a slot with no value.',
	"An id with spaces, commas, brackets or quotes appears in JSON quotes.",
	"",
	"Visuals sit under their page, and under their group if they have one.",
	'Groups under "bookmarks" are bookmark groups.',
	"",
	"After the brackets:",
	"",
	"  -> <page id>       the page that the bookmark opens",
	"  [hidden]           the page or visual is hidden in view mode",
	"  [no such page]     the bookmark points at a page that the report does not have",
	"  [saved on <page id>, does not switch page]",
	"                     the bookmark keeps the current page",
	"",
	"The command does not run the report checks. It also works on a project that fails pbirkit build.",
].reduce((text, line) => `${text}\n${line === "" ? "" : `  ${line}`}`);

const flags = {
	config: Flag.String("config").pipe(
		Flag.withAlias("c"),
		Flag.withDefault("pbirkit.config.ts"),
		Flag.withDescription("Config file of the project"),
	),
};

const reportError = (error: ConfigLoadError | ConfigShapeError) =>
	Effect.andThen(
		Console.error(errorMessage(error)),
		Effect.sync(() => {
			process.exitCode = 1;
		}),
	);

export const tree = Command.make("tree", flags, ({ config }) =>
	Effect.gen(function* () {
		const path = yield* Path.Path;
		return yield* Console.log(treeMessage(reportTree(yield* readConfig(path.resolve(config)))));
	}).pipe(Effect.catch(reportError)),
).pipe(
	Command.withDescription(HELP),
	Command.withShortDescription("List the pages, visuals and bookmarks of the project as a tree"),
	Command.withExamples(({ commandPath }) => [
		{ command: commandPath.join(" "), description: "Print the tree of pbirkit.config.ts in this folder" },
		{
			command: `${commandPath.join(" ")} -c other.config.ts`,
			description: "Print the tree of another config file",
		},
	]),
);
