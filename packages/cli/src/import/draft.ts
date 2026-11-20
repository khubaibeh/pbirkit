import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { Array as Arr, HashMap, Option, Predicate, Result } from "effect";
import { omit } from "effect/Struct";

import { buildFiles, resourcePackages } from "@pbirkit/core/build";
import { Config, ReportItem } from "@pbirkit/core/config";
import { at } from "@pbirkit/core/expr";
import { Model } from "@pbirkit/core/model";
import type { Resource } from "@pbirkit/core/resource";
import { decoded, flattenVisuals } from "@pbirkit/core/tree";
import type { BookmarkNode, Content, PageNode, ReportTree } from "@pbirkit/core/tree";

import { fileKey, hash, isOwned, projectEntries } from "../build/tree.ts";
import type { TreeFile } from "../build/tree.ts";
import type { Project } from "../pbip/project.ts";
import { fileJson } from "../pbip/tree.ts";

type Report = Config["report"];
type Page = Report["pages"][number];
type Bookmarks = NonNullable<Report["bookmarks"]>;
type ModelConfig = NonNullable<Config["model"]>;

export interface Fallback {
	readonly label: string;
	readonly reason: string;
}

export interface Draft {
	readonly config: Config;
	readonly fallbacks: ReadonlyArray<Fallback>;
}

type Levels = ReadonlyMap<string, number>;

type Placed = { readonly placed: boolean; readonly content: Content<unknown> };

const REBUILD_DIFFERS = "The rebuilt JSON differs from the source file";

const MAX_ROUNDS = 8;

const encoder = new TextEncoder();

const readPbip = decoded(Config.fields.pbip.members[0], "pbip");
const readPlatform = decoded(ReportItem.fields.platform.members[0], "platform");
const readPbir = decoded(ReportItem.fields.pbir.members[0], "pbir");
const readReport = decoded(ReportItem.fields.definition.members[0], "report");
const readVersion = decoded(ReportItem.fields.version.members[0], "version");
const readExtensions = decoded(ReportItem.fields.extensions.schema, "report extensions");
const readPbism = decoded(Model.fields.pbism.members[0], "pbism");
const readModelReference = decoded(Model.fields.modelReference.schema, "model reference");
const readEditorSettings = decoded(Model.fields.editorSettings.schema, "editor settings");

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
	Predicate.isReadonlyObject(value) && !Array.isArray(value);

const without = (value: unknown, key: string): unknown => (isObject(value) ? omit(value, [key]) : value);

const platformParts = (value: unknown, type: "Report" | "SemanticModel") => {
	const metadata = at(value, "metadata");
	const settings = at(value, "config");
	if (!isObject(metadata) || !isObject(settings) || metadata["type"] !== type)
		return Result.fail("Unsupported .platform properties");
	const { type: _type, displayName, ...rest } = metadata;
	const { version, logicalId, ...other } = settings;
	const named = typeof displayName === "string" || (type === "Report" && displayName === undefined);
	if (typeof logicalId !== "string" || !named || Object.keys(other).length > 0)
		return Result.fail("Unsupported .platform properties");
	return Result.map(readPlatform({ $schema: at(value, "$schema"), version, ...rest }), (item) => ({
		displayName: typeof displayName === "string" ? displayName : undefined,
		logicalId,
		item,
	}));
};

const uniqueBy = <A>(items: ReadonlyArray<A>, key: (item: A) => string): ReadonlyArray<A> =>
	Arr.dedupeWith(items, (left, right) => key(left) === key(right));

const leftoverGroup = (relative: string): string => {
	const [first = relative, second] = relative.split("/");
	return first === "definition" && second !== undefined ? `${first}/${second}` : first;
};

const byPath = (left: { readonly path: string }, right: { readonly path: string }): number =>
	left.path < right.path ? -1 : left.path > right.path ? 1 : 0;

const draftContext = (project: Project, levels: Levels) => {
	const fallbacks: Array<Fallback> = [];
	const files = Array.from(HashMap.values(project.tree));
	const url = (path: string) => pathToFileURL(join(project.root, path));
	const level = (path: string) => levels.get(fileKey(path)) ?? 0;
	const fallback = (label: string, reason: string) => {
		fallbacks.push({ label, reason });
	};

	const pick = <A>(path: string, label: string, candidates: ReadonlyArray<Content<A>>): A | URL => {
		const typed = candidates.filter((candidate): candidate is Result.Success<A, string> =>
			Result.isSuccess(candidate),
		);
		const chosen = typed[level(path)];
		if (chosen !== undefined) return chosen.success;
		const failure = candidates.find((candidate) => Result.isFailure(candidate));
		fallback(label, typed.length === 0 && failure !== undefined ? failure.failure : REBUILD_DIFFERS);
		return url(path);
	};

	return {
		project,
		files,
		fallbacks,
		url,
		level,
		fallback,
		pick,
		json: (path: string) => fileJson(project.tree, path),
		has: (path: string) => HashMap.has(project.tree, fileKey(path)),
		hasUnder: (folder: string) => files.some((file) => fileKey(file.path).startsWith(fileKey(`${folder}/`))),
		folderUrl: (path: string) => pathToFileURL(`${join(project.root, path)}${sep}`),
		item: <A>(path: string, label: string, name: string, content: Content<A>) => {
			const value = pick(path, label, [content]);
			return value instanceof URL ? { name, file: value } : value;
		},
		placed: (node: Placed, label: string) => {
			if (!node.placed && Result.isFailure(node.content)) fallback(label, node.content.failure);
			return node.placed;
		},
	};
};

type Context = ReturnType<typeof draftContext>;

const draftPage = (context: Context, page: PageNode): Page => {
	const visuals = flattenVisuals(page.visuals)
		.filter((visual) => context.placed(visual, `Visual ${page.name}/${visual.name}`))
		.toSorted(byPath)
		.map((visual) =>
			context.item(visual.path, `Visual ${page.name}/${visual.name}`, visual.name, visual.content),
		);
	const value = context.pick(page.path, `Page ${page.name}`, [page.content]);
	return value instanceof URL ? { name: page.name, file: value, visuals } : { ...value, visuals };
};

const draftBookmarks = (
	context: Context,
	index: ReportTree,
	metadata: NonNullable<ReportTree["bookmarksMetadata"]>,
): Bookmarks => {
	const entry = (node: BookmarkNode) =>
		context.item(node.path, `Bookmark ${node.name}`, node.name, node.content);
	const [groupFailure] = index.bookmarks.flatMap((node) =>
		node.kind === "group" && Result.isFailure(node.content) ? [node.content.failure] : [],
	);
	const content =
		groupFailure === undefined
			? Result.map(metadata.content, (value) => omit(value, ["items"]))
			: Result.fail(groupFailure);
	const typed = context.pick(metadata.path, "Bookmarks metadata", [content]);
	if (!(typed instanceof URL))
		return {
			...typed,
			items: index.bookmarks.map((node) =>
				node.kind === "group"
					? {
							name: node.name,
							displayName: node.displayName,
							children: node.children.map((child) => entry(child)),
						}
					: entry(node),
			),
		};
	const nodes = uniqueBy(
		index.bookmarks.flatMap((node) => (node.kind === "group" ? node.children : [node])),
		(node) => fileKey(node.path),
	);
	return {
		file: typed,
		items: nodes.filter((node) => context.placed(node, `Bookmark ${node.name}`)).map((node) => entry(node)),
	};
};

const draftResources = (context: Context, index: ReportTree): ReadonlyArray<Resource> =>
	uniqueBy(index.resources, (node) =>
		node.kind === "customVisual" ? `visual/${node.name}` : fileKey(node.path),
	).flatMap((node): ReadonlyArray<Resource> => {
		const label = `Resource ${node.name}`;
		if (Result.isFailure(node.content)) {
			context.fallback(label, node.content.failure);
			return [];
		}
		const data = node.content.success;
		if (data.kind === "customVisual") return [{ kind: data.kind, guid: data.guid, source: data.source }];
		if (data.kind === "image") return [{ kind: data.kind, name: data.name, file: context.url(node.path) }];
		if (context.level(node.path) === 0) return [data];
		context.fallback(label, REBUILD_DIFFERS);
		return [];
	});

const draftReport = (context: Context, index: ReportTree): Report => {
	const { project, json, pick } = context;
	const inReport = (file: string) => `${project.report}/${file}`;
	const resources = draftResources(context, index);
	const definitionValue = json(inReport("definition/report.json"));
	const definition = readReport(definitionValue);
	const strippable =
		resources.length > 0 &&
		isDeepStrictEqual(resourcePackages(resources), at(definitionValue, "resourcePackages"));
	const platform = pick(inReport(".platform"), "Report platform", [
		platformParts(json(inReport(".platform")), "Report"),
	]);
	const pbir = json(inReport("definition.pbir"));
	const extensionsPath = inReport("definition/reportExtensions.json");
	const extensions = context.has(extensionsPath)
		? pick(extensionsPath, "Report extensions", [readExtensions(json(extensionsPath))])
		: undefined;
	const diagramPath = inReport("semanticModelDiagramLayout.json");

	return {
		...(project.report === `${project.name}.Report` ? {} : { path: project.report }),
		...(platform instanceof URL
			? { platform }
			: {
					...(platform.displayName === undefined || platform.displayName === project.name
						? {}
						: { displayName: platform.displayName }),
					logicalId: platform.logicalId,
					platform: platform.item,
				}),
		pbir: pick(inReport("definition.pbir"), "Report pbir", [
			readPbir(project.model === undefined ? pbir : without(pbir, "datasetReference")),
		]),
		definition: pick(
			inReport("definition/report.json"),
			"Report definition",
			strippable ? [readReport(without(definitionValue, "resourcePackages")), definition] : [definition],
		),
		version: pick(inReport("definition/version.json"), "Report version", [
			readVersion(json(inReport("definition/version.json"))),
		]),
		pagesMetadata: pick(index.pagesMetadata.path, "Pages metadata", [index.pagesMetadata.content]),
		pages: index.pages
			.filter((page) => context.placed(page, `Page ${page.name}`))
			.map((page) => draftPage(context, page)),
		...(index.bookmarksMetadata === undefined
			? {}
			: { bookmarks: draftBookmarks(context, index, index.bookmarksMetadata) }),
		...(resources.length === 0 ? {} : { resources }),
		...(extensions === undefined || extensions instanceof URL ? {} : { extensions }),
		...(context.has(diagramPath) ? { semanticModelDiagramLayout: context.url(diagramPath) } : {}),
	};
};

const draftModel = (context: Context, folder: string): ModelConfig => {
	const { has, json, pick } = context;
	const inModel = (file: string) => `${folder}/${file}`;
	const typedJson = <A>(file: string, label: string, read: (value: unknown) => Content<A>) => {
		const value = has(inModel(file)) ? pick(inModel(file), label, [read(json(inModel(file)))]) : undefined;
		return value instanceof URL ? undefined : value;
	};
	const source = (file: string) => (has(inModel(file)) ? context.url(inModel(file)) : undefined);
	const sourceFolder = (file: string) =>
		context.hasUnder(inModel(file)) ? context.folderUrl(inModel(file)) : undefined;
	const platform = pick(inModel(".platform"), "Model platform", [
		platformParts(json(inModel(".platform")), "SemanticModel"),
	]);
	const modelReference = typedJson("modelReference.json", "Model reference", readModelReference);
	const editorSettings = typedJson(".pbi/editorSettings.json", "Model editor settings", readEditorSettings);
	const diagramLayout = source("diagramLayout.json");
	const unappliedChanges = source(".pbi/unappliedChanges.json");
	const daxQueries = sourceFolder("DAXQueries");
	const tmdlScripts = sourceFolder("TMDLScripts");
	context.fallback("Model definition", "Kept the semantic model definition in assets/model");

	return {
		...(platform instanceof URL
			? { path: folder, platform }
			: {
					...(platform.displayName === undefined ? {} : { name: platform.displayName }),
					path: folder,
					logicalId: platform.logicalId,
					platform: platform.item,
				}),
		pbism: pick(inModel("definition.pbism"), "Model pbism", [readPbism(json(inModel("definition.pbism")))]),
		definition: context.folderUrl(inModel("definition")),
		...(modelReference === undefined ? {} : { modelReference }),
		...(editorSettings === undefined ? {} : { editorSettings }),
		...(diagramLayout === undefined ? {} : { diagramLayout }),
		...(unappliedChanges === undefined ? {} : { unappliedChanges }),
		...(daxQueries === undefined ? {} : { daxQueries }),
		...(tmdlScripts === undefined ? {} : { tmdlScripts }),
	};
};

const leftoverFiles = (context: Context, config: Config) => {
	const built = buildFiles(config);
	const claimed = new Set(built.flatMap((file) => ("sourceFolder" in file ? [] : [fileKey(file.path)])));
	const folders = built.flatMap((file) => ("sourceFolder" in file ? [fileKey(`${file.path}/`)] : []));
	const isClaimed = (key: string) => claimed.has(key) || folders.some((folder) => key.startsWith(folder));

	return (folder: string, owner: string) => {
		const prefix = `${folder}/`;
		const found = context.files
			.filter((file) => fileKey(file.path).startsWith(fileKey(prefix)) && !isClaimed(fileKey(file.path)))
			.map((file) => file.path.slice(prefix.length))
			.toSorted();
		for (const [group, paths] of Map.groupBy(found, leftoverGroup))
			context.fallback(
				group,
				`Copied ${paths.length} unmapped ${paths.length === 1 ? "file" : "files"} into ${owner}.files`,
			);
		return found.length === 0
			? {}
			: { files: Object.fromEntries(found.map((path) => [path, context.url(`${prefix}${path}`)])) };
	};
};

const draftConfig = (project: Project, index: ReportTree, levels: Levels): Draft => {
	const context = draftContext(project, levels);
	const pbip = context.pick(project.filename, "pbip", [
		readPbip(without(context.json(project.filename), "artifacts")),
	]);
	const report = draftReport(context, index);
	const model = project.model === undefined ? undefined : draftModel(context, project.model);
	const typed: Config = { name: project.name, pbip, report, ...(model === undefined ? {} : { model }) };
	const leftovers = leftoverFiles(context, typed);
	const config: Config = {
		...typed,
		report: { ...typed.report, ...leftovers(project.report, "report") },
		...(model === undefined || project.model === undefined
			? {}
			: { model: { ...model, ...leftovers(project.model, "model") } }),
	};
	return { config, fallbacks: context.fallbacks };
};
const sameContent = (file: TreeFile | undefined, content: string): boolean =>
	file !== undefined && file.hash === hash(encoder.encode(content));

const driftedPaths = (project: Project, config: Config): ReadonlyArray<string> => {
	const owned = projectEntries(project.filename, project.report, project.model);
	return buildFiles(config).flatMap((file) =>
		"content" in file &&
		isOwned(owned, file.path) &&
		!sameContent(Option.getOrUndefined(HashMap.get(project.tree, fileKey(file.path))), file.content)
			? [fileKey(file.path)]
			: [],
	);
};

export const settleConfig = (project: Project, index: ReportTree): Draft => {
	const levels = new Map<string, number>();
	for (let round = 1; ; round += 1) {
		const draft = draftConfig(project, index, levels);
		const drifted = driftedPaths(project, draft.config);
		if (drifted.length === 0 || round === MAX_ROUNDS) return draft;
		for (const key of drifted) levels.set(key, (levels.get(key) ?? 0) + 1);
	}
};
