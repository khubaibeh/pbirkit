import { Effect, FileSystem, Path } from "effect";

import { GitRepoError } from "./errors.ts";

const hasGit = (folder: string): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;

		if (yield* fs.exists(path.join(folder, ".git")).pipe(Effect.orElseSucceed(() => false))) return true;

		const parent = path.dirname(folder);

		return parent === folder ? false : yield* hasGit(parent);
	});

export const requireGitRepo = Effect.fnUntraced(function* (root: string) {
	if (!(yield* hasGit(root))) return yield* new GitRepoError({ folder: root });
});
