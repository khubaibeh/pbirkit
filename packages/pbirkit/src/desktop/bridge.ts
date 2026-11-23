import {
	isDesktopBridgeError,
	matchReportFolderToInstance,
	openSession,
	readDesktopStatus,
	resolveReportDir,
} from "@microsoft/powerbi-desktop-bridge-cli";
import type { DesktopBridgeSession, DesktopInstanceState } from "@microsoft/powerbi-desktop-bridge-cli";
import { Config, Duration, Effect, FileSystem, Option, Path } from "effect";
import type { Scope } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import {
	decodeEffect,
	decodeUnknownEffect,
	fromJsonString,
	Literal,
	String as SchemaString,
	Struct,
} from "effect/Schema";

import { causeDetail } from "../build/errors.ts";
import { DesktopError } from "./errors.ts";

const STATE_WAIT_MS = 10_000;

const MS_CLI_VERSION = "powerbi-desktop --version";

const MS_CLI_ENTRY = "@microsoft/powerbi-desktop-bridge-cli/cli";

const VERSION = /(\d+)\.(\d+)\.(\d+)/u;

const unresolved = (detail: string): DesktopError =>
	new DesktopError({ code: "MS_CLI_UNREADABLE", detail: `cannot find ${MS_CLI_ENTRY}: ${detail}` });

const MsCliPackage = fromJsonString(Struct({ version: SchemaString }));

const ReloadAccepted = Struct({ success: Literal(true) });

const DESKTOP_EXE = "PBIDesktop.exe";

const DesktopEnv = Config.all({
	exe: Config.option(Config.String("PBI_DESKTOP_PATH")),
	programFiles: Config.option(Config.String("ProgramFiles")),
	programFilesX86: Config.option(Config.String("ProgramFiles(x86)")),
	localAppData: Config.option(Config.String("LOCALAPPDATA")),
});

export type Instance = DesktopInstanceState;

export type Session = DesktopBridgeSession;

const fromBridge = (error: unknown): DesktopError =>
	isDesktopBridgeError(error)
		? new DesktopError({
				code: error.code === "BRIDGE_ERROR" ? (error.bridgeCode ?? error.code) : error.code,
				detail: error.message,
			})
		: new DesktopError({
				code: "UNEXPECTED",
				detail: error instanceof Error ? error.message : String(error),
			});

const attempt = <A>(run: () => A) => Effect.try({ try: run, catch: fromBridge });

const attemptAsync = <A>(run: () => Promise<A>) => Effect.tryPromise({ try: run, catch: fromBridge });

const requireWindows = Effect.suspend(() =>
	process.platform === "win32"
		? Effect.void
		: Effect.fail(
				new DesktopError({ code: "UNSUPPORTED_OS", detail: "the desktop commands run only on Windows" }),
			),
);

export const readInstances = Effect.gen(function* () {
	yield* requireWindows;
	const status = yield* attemptAsync(() => readDesktopStatus({ applicationStateWaitMs: STATE_WAIT_MS }));
	const failed = status.diagnostics[0];
	if (failed !== undefined) return yield* new DesktopError({ code: failed.code, detail: failed.message });

	return status.instances;
});

export const matchReport = (report: string, instances: ReadonlyArray<Instance>) =>
	attempt(() => matchReportFolderToInstance(report, [...instances]));

const desktopCandidates = Effect.gen(function* () {
	const path = yield* Path.Path;

	const env = yield* DesktopEnv.pipe(
		Effect.mapError((error) => new DesktopError({ code: "BAD_ENV", detail: error.message })),
	);
	const roots = [
		...Option.toArray(env.programFiles),
		...Option.toArray(env.programFilesX86),
		...Option.toArray(
			Option.map(env.localAppData, (folder) => path.join(folder, "Microsoft", "WindowsApps")),
		),
	];

	return [
		...Option.toArray(env.exe),
		...roots.flatMap((root) => [
			path.join(root, "Microsoft Power BI Desktop", "bin", DESKTOP_EXE),
			path.join(root, "Microsoft Power BI Desktop RS", "bin", DESKTOP_EXE),
			path.join(root, DESKTOP_EXE),
		]),
	];
});

const findDesktopExe = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem;

	const found = yield* Effect.findFirst(yield* desktopCandidates, (candidate) =>
		fs.exists(candidate).pipe(Effect.orElseSucceed(() => false)),
	);
	if (Option.isNone(found)) {
		return yield* new DesktopError({
			code: "DESKTOP_EXE_NOT_FOUND",
			detail: `Power BI Desktop was not found. Set PBI_DESKTOP_PATH to ${DESKTOP_EXE}`,
		});
	}

	return found.value;
});

export const launchDesktop = Effect.fnUntraced(function* (pbip: string) {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const path = yield* Path.Path;

	const exe = yield* findDesktopExe;
	const command = ChildProcess.make(exe, [path.resolve(pbip)], {
		detached: true,
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
	});

	return yield* Effect.scoped(Effect.flatMap(spawner.spawn(command), (handle) => handle.unref)).pipe(
		Effect.asVoid,
		Effect.mapError(
			(error) =>
				new DesktopError({ code: "LAUNCH_FAILED", detail: `cannot start ${exe}: ${causeDetail(error)}` }),
		),
	);
});

const openReport = (
	instance: Instance,
	report: string,
	waitMs: number,
): Effect.Effect<Session, DesktopError, Scope.Scope> =>
	Effect.gen(function* () {
		const session = yield* Effect.acquireRelease(
			attemptAsync(() => openSession({ pid: String(instance.pid) })),
			(opened) =>
				Effect.sync(() => {
					opened.dispose();
				}),
		);
		const state = yield* attemptAsync(() => session.getApplicationState({ waitMs }));
		const reportDir = yield* attempt(() => resolveReportDir(state.currentFilePath));
		const match = yield* matchReport(report, [{ ...instance, reportDir }]);
		if (match.status !== "matched") {
			return yield* new DesktopError({
				code: "FILE_CHANGED",
				detail: `Desktop pid ${instance.pid} no longer has ${report} open`,
			});
		}

		return session;
	});

export const withReport = <A, E, R>(
	instance: Instance,
	report: string,
	waitMs: number,
	use: (session: Session) => Effect.Effect<A, E, R>,
) => Effect.scoped(Effect.flatMap(openReport(instance, report, waitMs), use));

export const reload = Effect.fnUntraced(function* (session: Session, model: boolean, waitMs: number) {
	const reloaded = yield* attemptAsync(() => session.reload({ reloadModelDefinition: model, waitMs }));
	yield* decodeUnknownEffect(ReloadAccepted)(reloaded.result).pipe(
		Effect.mapError(
			(error) =>
				new DesktopError({
					code: "RELOAD_REJECTED",
					detail: `Desktop did not confirm the reload: ${error.message}`,
				}),
		),
	);

	return reloaded;
});

export const capture = Effect.fnUntraced(function* (
	session: Session,
	page: string,
	scale: number,
	waitMs: number,
) {
	const shot = yield* attemptAsync(() => session.captureScreenshot({ page, scale, waitMs })).pipe(
		Effect.timeoutOrElse({
			duration: Duration.millis(waitMs),
			orElse: () =>
				Effect.fail(
					new DesktopError({
						code: "SHOT_TIMEOUT",
						detail: `Desktop did not send page ${page} within ${waitMs / 1000} s`,
					}),
				),
		}),
	);
	if (shot.page !== page) {
		return yield* new DesktopError({
			code: "PAGE_MISMATCH",
			detail: `Desktop sent page ${shot.page} for page ${page}`,
		});
	}

	return shot;
});

export type MsCli =
	| { readonly _tag: "Current" }
	| { readonly _tag: "Missing"; readonly bundled: string }
	| { readonly _tag: "Old"; readonly version: string; readonly wanted: string; readonly bundled: string };

const versionOf = (text: string): string | null => VERSION.exec(text)?.[0] ?? null;

const atLeast = (version: string, wanted: string): boolean => {
	const have = version.split(".").map(Number);
	const need = wanted.split(".").map(Number);
	const index = have.findIndex((part, at) => part !== need[at]);

	return index === -1 || (have[index] ?? 0) > (need[index] ?? 0);
};

const bundledVersion = Effect.fnUntraced(function* (bundled: string) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const file = path.join(path.dirname(bundled), "..", "package.json");
	const unreadable = (detail: string) =>
		new DesktopError({ code: "MS_CLI_UNREADABLE", detail: `cannot read ${file}: ${detail}` });
	const text = yield* fs.readFileString(file).pipe(Effect.mapError((error) => unreadable(error.message)));
	const { version } = yield* decodeEffect(MsCliPackage)(text).pipe(
		Effect.mapError((error) => unreadable(error.message)),
	);

	return version;
});

export const findMsCli = Effect.gen(function* () {
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
	const path = yield* Path.Path;

	const entry = yield* Effect.try({
		try: () => new URL(import.meta.resolve(MS_CLI_ENTRY)),
		catch: (cause) => unresolved(String(cause)),
	});
	const bundled = yield* path
		.fromFileUrl(entry)
		.pipe(Effect.mapError((error) => unresolved(causeDetail(error))));
	const wanted = yield* bundledVersion(bundled);
	const output = yield* spawner
		.string(ChildProcess.make(MS_CLI_VERSION, [], { shell: true }))
		.pipe(Effect.orElseSucceed(() => ""));
	const version = versionOf(output);

	if (version === null) return { _tag: "Missing", bundled } satisfies MsCli;
	if (atLeast(version, wanted)) return { _tag: "Current" } satisfies MsCli;

	return { _tag: "Old", version, wanted, bundled } satisfies MsCli;
});
