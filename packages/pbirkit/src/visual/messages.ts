import { Result } from "effect";

import {
	catalogVisualTypes,
	containerObjects,
	dataRoles,
	isCatalogVisual,
	kindOf,
	objectStates,
	own,
	roleNames,
	visualObjects,
} from "@pbirkit/core/visual-catalog";
import type { ObjectDescriptor } from "@pbirkit/core/visual-catalog";

export const CONTAINER = "container";

const ROLE_KINDS: Readonly<Record<string, string>> = {
	"0": "grouping",
	"1": "measure",
	"2": "grouping or measure",
	Grouping: "grouping",
	Measure: "measure",
	GroupingOrMeasure: "grouping or measure",
};

const columns = (rows: ReadonlyArray<ReadonlyArray<string>>): ReadonlyArray<string> => {
	const widths = rows.reduce<ReadonlyArray<number>>(
		(sizes, row) => row.map((cell, index) => Math.max(sizes[index] ?? 0, cell.length)),
		[],
	);
	return rows.map((row) =>
		`  ${row.map((cell, index) => (index === row.length - 1 ? cell : cell.padEnd(widths[index] ?? 0))).join("  ")}`.trimEnd(),
	);
};

const noteOf = (description: string | undefined, displayName?: string): string | undefined => {
	const note = description?.replaceAll(/\s+/gu, " ").trim();
	return note === undefined || note === "" || note === displayName ? undefined : note;
};

const withNotes = (
	rows: ReadonlyArray<ReadonlyArray<string>>,
	notes: ReadonlyArray<string | undefined>,
): ReadonlyArray<string> =>
	columns(rows).flatMap((line, index) => {
		const note = notes[index];
		return note === undefined ? [line] : [line, `      ${note}`];
	});

const objectsOf = (type: string): Readonly<Record<string, ObjectDescriptor>> =>
	type === CONTAINER ? containerObjects() : visualObjects(type);

const statesNote = (states: ReadonlyArray<string> | undefined): string =>
	states === undefined ? "" : `states ${states.join(", ")}`;

export const typesMessage = (): string =>
	[
		`${catalogVisualTypes().length} visual types in the catalog`,
		...columns(catalogVisualTypes().map((type) => [type])),
		"",
		`Use "${CONTAINER}" for the objects that every visual frame shares (visualContainerObjects).`,
	].join("\n");

export const visualMessage = (type: string): Result.Result<string, string> => {
	if (type !== CONTAINER && !isCatalogVisual(type))
		return Result.fail(`"${type}" is not in the visual catalog. Run pbirkit visual to list the types`);
	const states = objectStates(type);
	const objects = Object.entries(objectsOf(type)).toSorted(([first], [second]) =>
		first.localeCompare(second),
	);
	const roles = type === CONTAINER ? [] : dataRoles(type);
	const names = type === CONTAINER ? [] : roleNames(type);
	return Result.succeed(
		[
			type,
			...(names.length === 0
				? []
				: [
						"",
						"roles",
						...withNotes(
							names.map((name) => {
								const role = roles.find((known) => known.name === name);
								return role === undefined
									? [name, "-", "-"]
									: [name, ROLE_KINDS[role.kind] ?? role.kind, role.displayName ?? "-"];
							}),
							names.map((name) => {
								const role = roles.find((known) => known.name === name);
								return noteOf(role?.description, role?.displayName);
							}),
						),
					]),
			"",
			`objects (${objects.length})`,
			...withNotes(
				objects.map(([name, object]) => [
					name,
					`${Object.keys(object.properties).length} properties`,
					statesNote(states[name]),
				]),
				objects.map(([, object]) => noteOf(object.description, object.displayName)),
			),
		].join("\n"),
	);
};

export const objectMessage = (type: string, name: string): Result.Result<string, string> => {
	if (type !== CONTAINER && !isCatalogVisual(type))
		return Result.fail(`"${type}" is not in the visual catalog. Run pbirkit visual to list the types`);
	const object = own(objectsOf(type), name);
	if (object === undefined)
		return Result.fail(`"${name}" is not a ${type} object. Run pbirkit visual ${type} to list its objects`);
	const states = own(objectStates(type), name);
	const note = noteOf(object.description, object.displayName);
	const properties = Object.entries(object.properties);
	return Result.succeed(
		[
			`${type}.${name}${object.displayName === undefined ? "" : ` (${object.displayName})`}`,
			...(note === undefined ? [] : [note]),
			...(states === undefined ? [] : [statesNote(states)]),
			"",
			...withNotes(
				properties.map(([property, descriptor]) => [
					property,
					descriptor.displayName ?? "-",
					kindOf(descriptor.type),
				]),
				properties.map(([, descriptor]) => noteOf(descriptor.description, descriptor.displayName)),
			),
		].join("\n"),
	);
};

export const objectJson = (type: string, name?: string): Result.Result<string, string> => {
	if (type !== CONTAINER && !isCatalogVisual(type))
		return Result.fail(`"${type}" is not in the visual catalog. Run pbirkit visual to list the types`);
	const objects = objectsOf(type);
	if (name === undefined)
		return Result.succeed(
			JSON.stringify(
				{
					roles:
						type === CONTAINER
							? []
							: roleNames(type).map(
									(role) => dataRoles(type).find((known) => known.name === role) ?? { name: role },
								),
					objects,
					states: objectStates(type),
				},
				null,
				2,
			),
		);
	const object = own(objects, name);
	return object === undefined
		? Result.fail(`"${name}" is not a ${type} object. Run pbirkit visual ${type} to list its objects`)
		: Result.succeed(JSON.stringify({ ...object, states: own(objectStates(type), name) }, null, 2));
};
