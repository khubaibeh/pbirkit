import { Selector } from "#schemas/formatting-object-definitions/1.5.0.ts";
import { FilterDefinition, QueryExpressionContainer } from "#schemas/semantic-query/1.4.0.ts";

import { FilterType, filterConfiguration } from "./shared.ts";

export * from "./shared.ts";

export const { FilterContainerFormattingObjects, FilterContainer, FilterConfig } = filterConfiguration({
	QueryExpressionContainer,
	FilterDefinition,
	Selector,
	FilterType,
});

export type FilterContainer = typeof FilterContainer.Type;
export type FilterConfig = typeof FilterConfig.Type;
export type FilterContainerFormattingObjects = typeof FilterContainerFormattingObjects.Type;
