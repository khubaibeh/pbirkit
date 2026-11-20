#!/usr/bin/env node
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect } from "effect";
import { Command } from "effect/cli";

import { build } from "./build/index.ts";
import { desktop } from "./desktop/index.ts";
import { diff } from "./diff/index.ts";
import { importCommand } from "./import/index.ts";
import { tree } from "./tree/index.ts";

const pbirkit = Command.make("pbirkit").pipe(
	Command.withDescription("Tools for building Power BI reports from code"),
	Command.withSubcommands([build, desktop, diff, importCommand, tree]),
);

NodeRuntime.runMain(pbirkit.pipe(Command.run({ version: "0.0.0" }), Effect.provide(NodeServices.layer)));
