import {
	getCapabilities,
	getInstanceSelectors,
	getVcoCapabilities,
	listVcoKeys,
	listVisualTypes,
} from "@microsoft/powerbi-core-visual-schema";
import type {
	DataRoleDescriptor,
	PropertyTypeDescriptor,
	VcoPropertyType,
} from "@microsoft/powerbi-core-visual-schema";

import { at } from "../expr/query.ts";
import type { CatalogVisual, CheckedObjects, CheckedRoles } from "./types.ts";

export type { CatalogVisual, CheckedObjects, CheckedRoles } from "./types.ts";

export type PropertyType = PropertyTypeDescriptor | VcoPropertyType;

export interface CatalogProperty {
	readonly displayName?: string;
	readonly description?: string;
	readonly type?: PropertyType;
}

export interface ObjectDescriptor {
	readonly displayName?: string;
	readonly description?: string;
	readonly properties: Readonly<Record<string, CatalogProperty>>;
}

export const own = <V>(values: Readonly<Record<string, V>>, key: string): V | undefined =>
	Object.hasOwn(values, key) ? values[key] : undefined;

const visualTypes: ReadonlySet<string> = new Set(listVisualTypes());

const containerKeys: ReadonlySet<string> = new Set(listVcoKeys().filter((key) => !key.startsWith("_")));

export const catalogVisualTypes = (): ReadonlyArray<string> => [...visualTypes];

export const isCatalogVisual = (type: string): boolean => visualTypes.has(type);

export const objectsFor =
	<const Type extends CatalogVisual>(_type: Type) =>
	<const Objects>(objects: CheckedObjects<Type, Objects>) =>
		objects;

export const rolesFor =
	<const Type extends CatalogVisual>(_type: Type) =>
	<const QueryState>(queryState: CheckedRoles<Type, QueryState>) =>
		queryState;

const capabilities = (type: string) => (visualTypes.has(type) ? getCapabilities(type) : undefined);

export const visualObjects = (type: string): Readonly<Record<string, ObjectDescriptor>> =>
	capabilities(type)?.objects ?? {};

export const containerObjects = (): Readonly<Record<string, ObjectDescriptor>> =>
	Object.fromEntries(
		[...containerKeys].flatMap((key) => {
			const entry = getVcoCapabilities(key);
			return entry === undefined ? [] : [[key, entry]];
		}),
	);

export const dataRoles = (type: string): ReadonlyArray<DataRoleDescriptor> =>
	capabilities(type)?.dataRoles ?? [];

export const objectStates = (type: string): Readonly<Record<string, ReadonlyArray<string>>> =>
	(visualTypes.has(type) ? getInstanceSelectors(type) : undefined) ?? {};

const list = (value: unknown): ReadonlyArray<unknown> => (Array.isArray(value) ? value : []);

const record = (value: unknown): Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !Array.isArray(value)
		? Object.fromEntries(Object.entries(value))
		: {};

export const enumValues = (type: PropertyType | undefined): ReadonlyArray<string | number> => {
	const members = type?.enumeration;
	if (members === undefined) return [];
	return (Array.isArray(members) ? members : (members.allMembers ?? [])).map((member) => member.value);
};

export const kindOf = (type: PropertyType | undefined): string => {
	if (type === undefined) return "-";
	const values = enumValues(type);
	if (values.length > 0) return `enum ${values.map((value) => JSON.stringify(value)).join(" | ")}`;
	if (type.fill !== undefined) return "color";
	if ("variant" in type) return "field or value";
	if (type.formatting !== undefined) return `formatting ${Object.keys(type.formatting).join(", ")}`;
	if (typeof type.text === "object") return "rich text";
	return Object.keys(type).join(", ");
};

const mappingsOf = (type: string): ReadonlyArray<unknown> => list(capabilities(type)?.dataViewMappings);

const conditionsOf = (type: string): ReadonlyArray<Readonly<Record<string, unknown>>> =>
	mappingsOf(type).flatMap((mapping) =>
		list(at(mapping, "conditions")).map((condition) => record(condition)),
	);

const hasOpenMapping = (type: string): boolean =>
	mappingsOf(type).some((mapping) => list(at(mapping, "conditions")).length === 0);

export const roleNames = (type: string): ReadonlyArray<string> => [
	...new Set([
		...dataRoles(type).map((role) => role.name),
		...conditionsOf(type).flatMap((condition) => Object.keys(condition)),
	]),
];

const maxOf = (condition: Readonly<Record<string, unknown>>, role: string): number => {
	const max = at(own(condition, role), "max");
	return typeof max === "number" ? max : Number.POSITIVE_INFINITY;
};

const literalOf = (value: unknown): unknown => {
	const literal = at(at(at(value, "expr"), "Literal"), "Value");
	if (typeof literal !== "string") return value;
	if (/^'.*'$/su.test(literal)) return literal.slice(1, -1).replaceAll("''", "'");
	if (/^-?\d+(?:\.\d+)?[DLM]?$/u.test(literal)) return Number(literal.replace(/[DLM]$/u, ""));
	return literal;
};

const propertyIssues = (
	where: string,
	objectName: string,
	object: ObjectDescriptor,
	properties: Readonly<Record<string, unknown>>,
): ReadonlyArray<string> =>
	Object.entries(properties).flatMap(([name, value]) => {
		const property = own(object.properties, name);
		if (property === undefined) return [`${where}: "${name}" is not a property of ${objectName}`];
		const values = enumValues(property.type);
		const literal = literalOf(value);
		return values.length === 0 ||
			!(typeof literal === "string" || typeof literal === "number") ||
			values.some((allowed) => String(allowed) === String(literal))
			? []
			: [
					`${where}: ${objectName}.${name} is ${JSON.stringify(literal)}, which is not one of ${values.map((allowed) => JSON.stringify(allowed)).join(", ")}`,
				];
	});

interface Entries {
	readonly type: string;
	readonly key: string;
	readonly owner: string;
	readonly objects: Readonly<Record<string, ObjectDescriptor>>;
	readonly themed: boolean;
}

const entryIssues = ({ type, key, owner, objects, themed }: Entries, value: unknown): ReadonlyArray<string> =>
	Object.entries(record(value)).flatMap(([objectName, entries]) => {
		if (themed && objectName === "*") return [];
		const object = own(objects, objectName);
		if (object === undefined) return [`${key}.${objectName} is not ${owner}`];
		const states = own(objectStates(type), objectName);
		return list(entries).flatMap((entry, index) => {
			const where = `${key}.${objectName}[${index}]`;
			const properties = record(themed ? entry : at(entry, "properties"));
			const settings = themed
				? Object.fromEntries(Object.entries(properties).filter(([name]) => !name.startsWith("$")))
				: properties;
			const id = themed ? properties.$id : at(at(entry, "selector"), "id");
			return propertyIssues(where, objectName, object, settings).concat(
				states === undefined || typeof id !== "string" || states.includes(id)
					? []
					: [
							`${where}: selector id "${id}" is not a state of ${objectName}, which takes ${states.map((state) => `"${state}"`).join(", ")}`,
						],
			);
		});
	});

const fieldCount = (count: number): string => `${count} ${count === 1 ? "field" : "fields"}`;

const roleIssues = (type: string, queryState: unknown): ReadonlyArray<string> => {
	const roles = roleNames(type);
	if (roles.length === 0) return [];
	const counts = Object.entries(record(queryState)).map(
		([role, state]) => [role, list(at(state, "projections")).length] as const,
	);
	const unknown = counts.flatMap(([role]) =>
		roles.includes(role)
			? []
			: [
					`query role "${role}" is not a ${type} role, which takes ${roles.map((known) => `"${known}"`).join(", ")}`,
				],
	);
	const known = counts.filter(([role]) => roles.includes(role));
	const conditions = conditionsOf(type);
	if (
		conditions.length === 0 ||
		hasOpenMapping(type) ||
		conditions.some((condition) => known.every(([role, count]) => count <= maxOf(condition, role)))
	)
		return unknown;
	const over = known.flatMap(([role, count]) => {
		const max = Math.max(...conditions.map((condition) => maxOf(condition, role)));
		return count > max ? [`query role "${role}" has ${count} fields, but ${type} takes at most ${max}`] : [];
	});
	return [
		...unknown,
		...(over.length > 0
			? over
			: [
					`query roles ${known
						.filter(([, count]) => count > 0)
						.map(([role, count]) => `"${role}" (${fieldCount(count)})`)
						.join(", ")} do not fit together in any ${type} data mapping`,
				]),
	];
};

export const visualCatalogIssues = (visual: unknown): ReadonlyArray<string> => {
	const type = at(visual, "visualType");
	if (typeof type !== "string" || !visualTypes.has(type)) return [];
	return [
		...roleIssues(type, at(at(visual, "query"), "queryState")),
		...entryIssues(
			{ type, key: "objects", owner: `a ${type} object`, objects: visualObjects(type), themed: false },
			at(visual, "objects"),
		),
		...entryIssues(
			{
				type,
				key: "visualContainerObjects",
				owner: "a visual container object",
				objects: containerObjects(),
				themed: false,
			},
			at(visual, "visualContainerObjects"),
		),
	];
};

const marks = (names: ReadonlyArray<string>): Readonly<Record<string, 0>> =>
	Object.fromEntries(names.toSorted().map((name) => [name, 0]));

export const catalogNames = () =>
	Object.fromEntries(
		catalogVisualTypes()
			.toSorted()
			.map((type) => [
				type,
				{
					roles: marks(roleNames(type)),
					objects: Object.fromEntries(
						Object.entries(visualObjects(type))
							.toSorted(([first], [second]) => first.localeCompare(second))
							.map(([name, object]) => [name, marks(Object.keys(object.properties))]),
					),
				},
			]),
	);

export const unlistedObjects = (visual: unknown): Readonly<Record<string, ReadonlyArray<string>>> => {
	const type = at(visual, "visualType");
	if (typeof type !== "string" || !visualTypes.has(type)) return {};
	const objects = visualObjects(type);
	return Object.fromEntries(
		Object.entries(record(at(visual, "objects"))).flatMap(([name, entries]) => {
			const known = own(objects, name)?.properties;
			const used = [
				...new Set(list(entries).flatMap((entry) => Object.keys(record(at(entry, "properties"))))),
			];
			const unlisted =
				known === undefined ? used : used.filter((property) => !Object.hasOwn(known, property));
			return known !== undefined && unlisted.length === 0 ? [] : [[name, unlisted.toSorted()]];
		}),
	);
};

export const unlistedRoles = (visual: unknown): ReadonlyArray<string> => {
	const type = at(visual, "visualType");
	if (typeof type !== "string" || !visualTypes.has(type)) return [];
	const roles = roleNames(type);
	return Object.keys(record(at(at(visual, "query"), "queryState")))
		.filter((role) => !roles.includes(role))
		.toSorted();
};

const mergeObjects = (
	first: Readonly<Record<string, ObjectDescriptor>>,
	second: Readonly<Record<string, ObjectDescriptor>>,
): Readonly<Record<string, ObjectDescriptor>> =>
	Object.fromEntries(
		[...new Set([...Object.keys(first), ...Object.keys(second)])].map((name) => [
			name,
			{ properties: { ...first[name]?.properties, ...second[name]?.properties } },
		]),
	);

export const themeCatalogIssues = (visualStyles: unknown): ReadonlyArray<string> =>
	Object.entries(record(visualStyles)).flatMap(([type, styles]) =>
		visualTypes.has(type)
			? Object.entries(record(styles)).flatMap(([style, value]) =>
					entryIssues(
						{
							type,
							key: `visualStyles.${type}.${style}`,
							owner: `a ${type} object or a visual container object`,
							objects: mergeObjects(containerObjects(), visualObjects(type)),
							themed: true,
						},
						value,
					),
				)
			: [],
	);
