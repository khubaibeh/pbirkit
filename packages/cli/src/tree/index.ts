import { Console, Effect, Option, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { buildFiles, reportFolder } from "@pbirkit/core/build";

import { readConfig } from "../build/config.ts";
import { buildTree } from "../build/outputs.ts";
import { isOwned } from "../build/tree.ts";
import { errorMessage, exitWith } from "../messages.ts";
import { findProject } from "../pbip/project.ts";
import { indexTree } from "../pbip/tree.ts";
import { treeMessage } from "./messages.ts";

const HELP = [
	"List the pages, visuals and bookmarks of the project as a tree.",
	"Use either --pbip for a PBIP folder or .pbip file, or --config for a config file.",
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
	"  [raw]              import preserves the item as a raw file",
	"  [no such page]     the bookmark points at a page that the report does not have",
	"  [saved on <page id>, does not switch page]",
	"                     the bookmark keeps the current page",
	"",
	"The command does not run the report checks. It also works on a project that fails pbirkit build.",
].reduce((text, line) => `${text}\n${line === "" ? "" : `  ${line}`}`);

const flags = {
	config: Flag.String("config").pipe(
		Flag.withAlias("c"),
		Flag.optional,
		Flag.withDescription("Config file of the project (defaults to pbirkit.config.ts)"),
	),
	pbip: Flag.String("pbip").pipe(Flag.optional, Flag.withDescription("PBIP project folder or .pbip file")),
};

const projectIndex = Effect.fnUntraced(function* (source: string) {
	const project = yield* findProject(source);
	return indexTree(project.name, project.report, project.tree);
});

const configIndex = Effect.fnUntraced(function* (file: string) {
	const config = yield* readConfig(file);
	const report = reportFolder(config);
	const files = buildFiles(config).filter((entry) => isOwned([`${report}/`], entry.path));
	return indexTree(config.name, report, yield* buildTree(files, []));
});

const readIndex = Effect.fnUntraced(function* (config: Option.Option<string>, pbip: Option.Option<string>) {
	const path = yield* Path.Path;

	return yield* Option.match(pbip, {
		onNone: () => configIndex(path.resolve(Option.getOrElse(config, () => "pbirkit.config.ts"))),
		onSome: projectIndex,
	});
});

export const tree = Command.make("tree", flags, ({ config, pbip }) =>
	Option.isSome(config) && Option.isSome(pbip)
		? exitWith(1)("[ERROR] tree: --config and --pbip are mutually exclusive")
		: readIndex(config, pbip).pipe(
				Effect.flatMap((index) => Console.log(treeMessage(index))),
				Effect.catch((error) => exitWith(1)(errorMessage("tree")(error))),
			),
).pipe(
	Command.withDescription(HELP),
	Command.withShortDescription("List the pages, visuals and bookmarks of the project as a tree"),
	Command.withExamples(({ commandPath }) => [
		{ command: commandPath.join(" "), description: "Print the tree of pbirkit.config.ts in this folder" },
		{
			command: `${commandPath.join(" ")} -c other.config.ts`,
			description: "Print the tree of another config file",
		},
		{
			command: `${commandPath.join(" ")} --pbip ./project`,
			description: "Print the tree of a PBIP project directly",
		},
	]),
);
