import { Console, Option, Result } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { exitWith } from "../messages.ts";
import { CONTAINER, objectJson, objectMessage, typesMessage, visualMessage } from "./messages.ts";

const HELP = [
	"Look up the formatting objects of the built-in visuals.",
	"The data comes from Microsoft's visual catalog, @microsoft/powerbi-core-visual-schema.",
	"",
	"  pbirkit visual                     list the visual types",
	"  pbirkit visual <type>              list the roles, objects and states of a visual",
	"  pbirkit visual <type> <object>     list the properties of one object",
	`  pbirkit visual ${CONTAINER} [object]   the objects every visual frame shares`,
	"",
	"Each property line has its name, its name in the Format pane and its kind.",
	"An indented line below a role, object or property gives its description, when the catalog has one.",
	"A kind of enum lists the values that the property takes.",
	'"states" lists the selector ids that the object takes, for example default and hover.',
	"",
	"pbirkit build warns about object names, property names, enum values, state ids and query roles",
	"that the catalog does not list. The catalog can lag behind Desktop, so treat a warning as a lead.",
].reduce((text, line) => `${text}\n${line === "" ? "" : `  ${line}`}`);

const flags = {
	type: Argument.String("type").pipe(
		Argument.optional,
		Argument.withDescription(`Visual type, for example cardVisual, or ${CONTAINER}`),
	),
	object: Argument.String("object").pipe(Argument.optional, Argument.withDescription("Object name")),
	json: Flag.Boolean("json").pipe(
		Flag.withDefault(false),
		Flag.withDescription("Print the catalog entry as JSON"),
	),
};

const messageOf = (
	type: Option.Option<string>,
	object: Option.Option<string>,
	json: boolean,
): Result.Result<string, string> => {
	if (Option.isNone(type)) return Result.succeed(typesMessage());
	if (json) return objectJson(type.value, Option.getOrUndefined(object));
	return Option.isNone(object) ? visualMessage(type.value) : objectMessage(type.value, object.value);
};

export const visual = Command.make("visual", flags, ({ type, object, json }) =>
	Result.match(messageOf(type, object, json), {
		onSuccess: (message) => Console.log(message),
		onFailure: (detail) => exitWith(2)(`[ERROR] visual: ${detail}`),
	}),
).pipe(
	Command.withDescription(HELP),
	Command.withShortDescription("Look up the formatting objects of a built-in visual"),
	Command.withExamples(({ commandPath }) => [
		{ command: `${commandPath.join(" ")} cardVisual`, description: "List the objects of the card" },
		{
			command: `${commandPath.join(" ")} cardVisual referenceLabel`,
			description: "List the properties of the card's reference label",
		},
		{
			command: `${commandPath.join(" ")} ${CONTAINER} title --json`,
			description: "Print the title object as JSON",
		},
	]),
);
