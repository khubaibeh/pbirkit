#!/usr/bin/env node
import { registerHooks } from "node:module";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { Command } from "effect/cli";

import { resolveCoreFromCli } from "./build/config.ts";
import { build } from "./build/index.ts";
import { desktop } from "./desktop/index.ts";
import { diff } from "./diff/index.ts";
import { importCommand } from "./import/index.ts";
import { tree } from "./tree/index.ts";
import { VERSION } from "./version.ts";
import { visual } from "./visual/index.ts";

registerHooks({ resolve: resolveCoreFromCli });

const pbirkit = Command.make("pbirkit").pipe(
	Command.withDescription("Tools for building Power BI reports from code"),
	Command.withSubcommands([build, desktop, diff, importCommand, tree, visual]),
);

NodeRuntime.runMain(pbirkit.pipe(Command.run({ version: VERSION }), Effect.provide(NodeServices.layer)));
