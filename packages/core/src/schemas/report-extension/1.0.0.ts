import { Array, Boolean, Literal, Literals, Number, String, Struct, optionalKey } from "effect/Schema";

import { SchemaUrl } from "#schemas/schema-url.ts";

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

export const ReportExtensionMeasureTemplate = Struct({
	daxTemplateName: String,
	version: Number,
});

export type ReportExtensionMeasureTemplate = typeof ReportExtensionMeasureTemplate.Type;

export const MeasureExtensionAnnotation = Struct({
	name: String,
	value: String,
});

export type MeasureExtensionAnnotation = typeof MeasureExtensionAnnotation.Type;

export const MeasureReference = Struct({
	schema: optionalKey(String),
	entity: String,
	name: String,
});

export type MeasureReference = typeof MeasureReference.Type;

export const ExpressionReferences = Struct({
	unrecognizedReferences: optionalKey(Boolean),
	measures: optionalKey(Array(MeasureReference)),
});

export type ExpressionReferences = typeof ExpressionReferences.Type;

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

export const ReportExtensionEntity = Struct({
	name: String,
	measures: optionalKey(Array(ReportExtensionMeasure)),
});

export type ReportExtensionEntity = typeof ReportExtensionEntity.Type;

export const ReportExtension = Struct({
	$schema: Literal(SchemaUrl.reportExtension["1.0.0"]),
	name: String,
	entities: optionalKey(Array(ReportExtensionEntity)),
});

export type ReportExtension = typeof ReportExtension.Type;
