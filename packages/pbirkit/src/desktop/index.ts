import { Console, Effect, FileSystem, Option, Path } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { reportFolder } from "@pbirkit/core/build";

import { loadConfig } from "../build/config.ts";
import { onFileSystem } from "../build/errors.ts";
import { DEFAULT_OUT, fromCwd, projectPaths } from "../build/paths.ts";
import { prepareState } from "../build/snapshot.ts";
import {
	findMsCli,
	capture,
	launchDesktop,
	matchReport,
	readInstances,
	reload as reloadReport,
	withReport,
} from "./bridge.ts";
import type { Instance } from "./bridge.ts";
import { DesktopError } from "./errors.ts";
import type { DesktopCommandError } from "./errors.ts";
import { errorMessage, msCliNote, shotMessage, statusMessage, unreachableReason } from "./messages.ts";
import type { Shot } from "./messages.ts";

const RELOAD_WAIT_MS = 30_000;

const SHOT_WAIT_MS = 15_000;

const POLL = "1 second";

const POLL_MS = 1000;

const NOT_READY_CODE = "HostNotReady";

const NOT_READY = /not ready/iu;

const SHOTS_FOLDER = "shots";

const THEME_NOTE =
	"Desktop reads theme files only when it opens the project. To apply a theme change, close Desktop and run pbirkit desktop open";

const MIN_SCALE = 1;

const MAX_SCALE = 3;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const configFlag = Flag.File("config", { mustExist: true }).pipe(
	Flag.withAlias("c"),
	Flag.withDefault("pbirkit.config.ts"),
	Flag.withDescription("Config file of the project"),
);

const loadProject = Effect.fnUntraced(function* (configFile: string) {
	const path = yield* Path.Path;

	const file = path.resolve(configFile);
	const { config } = yield* loadConfig(file);
	const paths = projectPaths(path, file, config.out ?? DEFAULT_OUT, Option.none());
	const pbip = path.join(paths.out, `${config.name}.pbip`);

	return {
		config,
		paths,
		pbip,
		report: path.join(paths.out, reportFolder(config)),
		shown: fromCwd(path, pbip),
	};
});

type Project = Effect.Success<ReturnType<typeof loadProject>>;

const findOurs = Effect.fnUntraced(function* (project: Project) {
	const instances = yield* readInstances;
	const match = yield* matchReport(project.report, instances);

	return { instances, match };
});

const unreachableNote = (instances: ReadonlyArray<Instance>): string =>
	instances
		.map((instance) => ({ pid: instance.pid, reason: unreachableReason(instance) }))
		.filter(({ reason }) => reason !== null)
		.map(({ pid, reason }) => `. Desktop pid ${pid} did not answer: ${reason ?? ""}`)
		.join("");

const requireOurs = Effect.fnUntraced(function* (project: Project) {
	const { instances, match } = yield* findOurs(project);
	if (match.status === "multiple") {
		return yield* new DesktopError({
			code: "AMBIGUOUS",
			detail: `Desktop pids ${match.instances.map((instance) => instance.pid).join(", ")} all have ${project.shown} open. Close all but one`,
		});
	}
	if (match.status === "none") {
		return yield* new DesktopError({
			code: "NOT_OPEN",
			detail: `no Desktop window has ${project.shown} open${unreachableNote(instances)}. To open it, run pbirkit desktop open`,
		});
	}

	return match.instance;
});

const reportError = (error: DesktopCommandError) =>
	Effect.andThen(
		Console.error(errorMessage(error)),
		Effect.sync(() => {
			process.exitCode = 1;
		}),
	);

const status = Command.make("status", { config: configFlag }, ({ config }) =>
	Effect.gen(function* () {
		const project = yield* loadProject(config);
		const { instances, match } = yield* findOurs(project);
		const ours =
			match.status === "matched" ? [match.instance] : match.status === "multiple" ? match.instances : [];
		const cli = msCliNote(yield* findMsCli);

		yield* Console.log([statusMessage(project.shown, instances, ours), ...cli].join("\n"));
	}).pipe(Effect.catch(reportError)),
).pipe(
	Command.withDescription(
		"List the Desktop windows the bridge can reach, and which one has this project open",
	),
);

const waitForOurs = (project: Project, deadline: number): Effect.Effect<Instance, DesktopError> =>
	Effect.gen(function* () {
		const { match } = yield* findOurs(project);
		if (match.status === "matched") return match.instance;
		if (Date.now() > deadline) {
			return yield* new DesktopError({
				code: "OPEN_TIMEOUT",
				detail: `Desktop did not open ${project.shown} in time. Check the Desktop window, then run pbirkit desktop status`,
			});
		}

		yield* Effect.sleep(POLL);

		return yield* waitForOurs(project, deadline);
	});

const openFlags = {
	config: configFlag,
	wait: Flag.Int("wait").pipe(
		Flag.withDefault(180),
		Flag.withDescription("Seconds to wait for Desktop to open the project"),
	),
};

const open = Command.make("open", openFlags, ({ config, wait }) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;

		if (wait < 0) {
			return yield* new DesktopError({ code: "BAD_FLAG", detail: "--wait must be 0 or more seconds" });
		}

		const project = yield* loadProject(config);
		const { match } = yield* findOurs(project);
		if (match.status === "matched") {
			return yield* Console.log(`desktop: pid ${match.instance.pid} already has ${project.shown} open`);
		}
		if (!(yield* fs.exists(project.pbip).pipe(onFileSystem("check", project.pbip)))) {
			return yield* new DesktopError({
				code: "NOT_BUILT",
				detail: `${project.shown} does not exist. Run pbirkit build first`,
			});
		}

		const started = Date.now();
		yield* launchDesktop(project.pbip);
		const instance = yield* waitForOurs(project, started + wait * 1000);
		const seconds = Math.round((Date.now() - started) / 1000);

		return yield* Console.log(`desktop: pid ${instance.pid} opened ${project.shown} in ${seconds} s`);
	}).pipe(Effect.catch(reportError)),
).pipe(
	Command.withDescription(
		"Open the built project in Power BI Desktop and wait until the bridge can reach it",
	),
);

const reloadFlags = {
	config: configFlag,
	model: Flag.Boolean("model").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Also reload the model definition"),
	),
};

const isNotReady = (error: DesktopError): boolean =>
	error.code === NOT_READY_CODE || NOT_READY.test(error.detail);

const reloadUntilReady = (
	project: Project,
	model: boolean,
	deadline: number,
): Effect.Effect<Instance, DesktopError> =>
	Effect.gen(function* () {
		const instance = yield* requireOurs(project);
		const waitMs = Math.max(0, deadline - Date.now());
		yield* withReport(instance, project.report, waitMs, (session) => reloadReport(session, model, waitMs));

		return instance;
	}).pipe(
		Effect.catchIf(
			(error) => isNotReady(error) && Date.now() + POLL_MS < deadline,
			() => Effect.andThen(Effect.sleep(POLL), reloadUntilReady(project, model, deadline)),
		),
	);

const reload = Command.make("reload", reloadFlags, ({ config, model }) =>
	Effect.gen(function* () {
		const project = yield* loadProject(config);
		const instance = yield* reloadUntilReady(project, model, Date.now() + RELOAD_WAIT_MS);

		return yield* Console.log(
			[
				`desktop: pid ${instance.pid} reloaded ${project.shown}${model ? " and its model definition" : ""}`,
				THEME_NOTE,
			].join("\n"),
		);
	}).pipe(Effect.catch(reportError)),
).pipe(
	Command.withDescription(
		"Make Desktop read the build again. Unsaved Desktop edits may be lost, and theme files reload only when Desktop opens the project",
	),
);

const shotFlags = {
	config: configFlag,
	pages: Argument.String("pages").pipe(
		Argument.variadic(),
		Argument.withDescription("Page names from the config. Leave out to capture every page"),
	),
	scale: Flag.Finite("scale").pipe(
		Flag.withDefault(2),
		Flag.withDescription(`Image scale, from ${MIN_SCALE} to ${MAX_SCALE}`),
	),
	dir: Flag.String("dir").pipe(
		Flag.optional,
		Flag.withDescription("Folder for the images, relative to where you run the command"),
	),
};

const pickPages = Effect.fnUntraced(function* (project: Project, names: ReadonlyArray<string>) {
	const known = project.config.report.pages.map((page) => page.name);
	const unknown = names.filter((name) => !known.includes(name));
	if (unknown.length > 0) {
		return yield* new DesktopError({
			code: "UNKNOWN_PAGE",
			detail: `the config has no page ${unknown.join(", ")}. Pages: ${known.join(", ")}`,
		});
	}

	return names.length === 0 ? known : names;
});

const shotsFolder = Effect.fnUntraced(function* (project: Project, dir: Option.Option<string>) {
	const path = yield* Path.Path;

	if (Option.isSome(dir)) return path.resolve(dir.value);

	yield* prepareState(project.paths);

	return path.join(project.paths.state, SHOTS_FOLDER);
});

const isPng = (image: Uint8Array): boolean => PNG_SIGNATURE.every((byte, index) => image[index] === byte);

const shot = Command.make("shot", shotFlags, ({ config, pages, scale, dir }) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		if (scale < MIN_SCALE || scale > MAX_SCALE) {
			return yield* new DesktopError({
				code: "BAD_FLAG",
				detail: `--scale must be from ${MIN_SCALE} to ${MAX_SCALE}`,
			});
		}

		const project = yield* loadProject(config);
		const names = yield* pickPages(project, pages);
		const instance = yield* requireOurs(project);
		const folder = yield* shotsFolder(project, dir);
		yield* fs.makeDirectory(folder, { recursive: true }).pipe(onFileSystem("create", folder));

		const shots = yield* withReport(instance, project.report, SHOT_WAIT_MS, (session) => {
			const save = Effect.fnUntraced(function* (name: string) {
				const { image } = yield* capture(session, name, scale, SHOT_WAIT_MS);
				if (image === undefined || !isPng(image)) {
					return yield* new DesktopError({ code: "BAD_IMAGE", detail: "Desktop sent no PNG image" });
				}

				const file = path.join(folder, `${name}.png`);
				yield* fs.writeFile(file, image).pipe(onFileSystem("write", file));

				return fromCwd(path, file);
			});

			return Effect.forEach(names, (name) =>
				Effect.match(save(name), {
					onFailure: (error): Shot => ({ page: name, file: null, error: errorMessage(error) }),
					onSuccess: (file): Shot => ({ page: name, file, error: null }),
				}),
			);
		});

		yield* Console.log(shotMessage(instance.pid, shots));

		return yield* Effect.sync(() => {
			if (shots.some((outcome) => outcome.error !== null)) process.exitCode = 1;
		});
	}).pipe(Effect.catch(reportError)),
).pipe(Command.withDescription("Save pages of the open project as PNG images, as Desktop shows them now"));

export const desktop = Command.make("desktop").pipe(
	Command.withDescription("Drive Power BI Desktop through its bridge"),
	Command.withSubcommands([status, open, reload, shot]),
);
