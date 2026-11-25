import { Array, Boolean, Finite, Literal, Literals, optionalKey, String, Struct } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

/** The data type of a report-level measure. */
export const PrimitiveTypeName = Literals([
	"Binary",
	"Boolean",
	"Date",
	"DateTime",
	"DateTimeZone",
	"Decimal",
	"Double",
	"Duration",
	"Integer",
	"Json",
	"None",
	"Null",
	"Text",
	"Time",
	"Variant",
]);

export type PrimitiveTypeName = typeof PrimitiveTypeName.Type;

/**
 * The quick measure template that made a measure.
 *
 * - `daxTemplateName`: The template name.
 * - `version`: The template version.
 */
export const ReportExtensionMeasureTemplate = Struct({
	daxTemplateName: String,
	version: Finite,
});

export type ReportExtensionMeasureTemplate = typeof ReportExtensionMeasureTemplate.Type;

/** A name and value pair on a measure. */
export const MeasureExtensionAnnotation = Struct({
	name: String,
	value: String,
});

export type MeasureExtensionAnnotation = typeof MeasureExtensionAnnotation.Type;

/**
 * A measure that a DAX expression uses.
 *
 * - `schema`: Leave it out for a model measure. Set it to the extension name for a measure from that
 *   extension.
 * - `entity`: The table of the measure.
 * - `name`: The measure name.
 */
export const MeasureReference = Struct({
	schema: optionalKey(String),
	entity: String,
	name: String,
});

export type MeasureReference = typeof MeasureReference.Type;

/**
 * The measures that a DAX expression uses.
 *
 * - `unrecognizedReferences`: False when Desktop knows every reference.
 */
export const ExpressionReferences = Struct({
	unrecognizedReferences: optionalKey(Boolean),
	measures: optionalKey(Array(MeasureReference)),
});

export type ExpressionReferences = typeof ExpressionReferences.Type;

/**
 * A measure that lives in the report, not in the model.
 *
 * - `name`: The measure name. It must be unique across the model and all extension measures.
 * - `dataCategory`: The data category, such as `WebUrl` or `ImageUrl`.
 * - `expression`: The DAX expression.
 * - `hidden`: When true, the field list hides the measure.
 * - `formatString`: The format string, in VBA style, such as `"#,0.00"`.
 * - `displayFolder`: The folder that holds the measure in the field list.
 * - `references`: The measures that `expression` uses.
 */
export const ReportExtensionMeasure = Struct({
	name: String,
	dataType: PrimitiveTypeName,
	dataCategory: optionalKey(String),
	expression: String,
	hidden: optionalKey(Boolean),
	formatString: optionalKey(String),
	measureTemplate: optionalKey(ReportExtensionMeasureTemplate),
	description: optionalKey(String),
	displayFolder: optionalKey(String),
	annotations: optionalKey(Array(MeasureExtensionAnnotation)),
	references: optionalKey(ExpressionReferences),
});

export type ReportExtensionMeasure = typeof ReportExtensionMeasure.Type;

/**
 * A model table that gets extra measures.
 *
 * - `name`: The table name. It must match a table in the model.
 */
export const ReportExtensionEntity = Struct({
	name: String,
	measures: optionalKey(Array(ReportExtensionMeasure)),
});

export type ReportExtensionEntity = typeof ReportExtensionEntity.Type;

/**
 * The `definition/reportExtensions.json` file. It holds measures that the report adds to the model.
 *
 * - `name`: The extension name.
 * - `entities`: The model tables that get extra measures.
 */
export const ReportExtension = Struct({
	$schema: Literal(SchemaUrl.reportExtension["1.0.0"]),
	name: String,
	entities: optionalKey(Array(ReportExtensionEntity)),
});

export type ReportExtension = typeof ReportExtension.Type;
