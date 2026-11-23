import { Effect, FileSystem, Path } from "effect";

import { matchReport, readInstances } from "../desktop/bridge.ts";
import { unreachableReason } from "../desktop/messages.ts";
import { DiscardError, onFileSystem } from "./errors.ts";
import type { Change } from "./merge.ts";

const samePath = (path: Path.Path, first: string, second: string): boolean =>
	path.resolve(first).toLowerCase() === path.resolve(second).toLowerCase();

export const requireDesktopClosed = Effect.fnUntraced(function* (
	report: string,
	pbip: string,
	shown: string,
) {
	const path = yield* Path.Path;

	if (process.platform !== "win32") return false;

	const instances = yield* readInstances.pipe(
		Effect.mapError(
			(error) =>
				new DiscardError({
					detail: `the build can't tell whether Desktop has ${shown} open (${error.detail}). Close Desktop, then build again`,
				}),
		),
	);
	const silent = instances.filter((instance) => unreachableReason(instance) !== null);
	if (silent.length > 0) {
		return yield* new DiscardError({
			detail: `Desktop pid ${silent.map((instance) => instance.pid).join(", ")} did not answer, so the build can't tell whether it has ${shown} open. Close it, then build again`,
		});
	}
	const match = yield* matchReport(report, instances).pipe(
		Effect.mapError((error) => new DiscardError({ detail: error.detail })),
	);
	const holding = instances.some(
		(instance) => instance.currentFilePath !== undefined && samePath(path, instance.currentFilePath, pbip),
	);
	if (holding || match.status !== "none") {
		return yield* new DiscardError({
			detail: `Desktop has ${shown} open. Close it without saving, then build again`,
		});
	}

	return true;
});

export const requireInside = Effect.fnUntraced(function* (
	out: string,
	shown: string,
	changes: ReadonlyArray<Change>,
) {
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;

	const root = yield* fs.realPath(out).pipe(onFileSystem("resolve", out));
	for (const { file } of changes) {
		const target = path.join(out, file.path);
		if (!(yield* fs.exists(target).pipe(onFileSystem("check", target)))) continue;
		const real = yield* fs.realPath(target).pipe(onFileSystem("resolve", target));
		if (real !== root && !real.startsWith(`${root}${path.sep}`)) {
			return yield* new DiscardError({
				detail: `${file.path} leads to ${real}, outside ${shown}. Remove the link, then build again`,
			});
		}
	}
});
