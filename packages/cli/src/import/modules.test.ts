import { expect, it } from "vite-plus/test";

import { renderModule, swapsOf } from "./modules.ts";
import { colorName, colorRoles, keyOf, nameScope, wordsOf } from "./names.ts";

const VISUAL_JSON = `{
  "name": "sales",
  "position": {
    "x": 0,
    "y": 0,
    "width": 400,
    "height": 300
  },
  "visual": {
    "visualType": "barChart",
    "query": {
      "queryState": {
        "Category": {
          "projections": [
            {
              "field": {
                "Column": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Sales"
                    }
                  },
                  "Property": "Region"
                }
              },
              "queryRef": "Sales.Region",
              "nativeQueryRef": "Region",
              "active": true
            }
          ]
        },
        "Y": {
          "projections": [
            {
              "field": {
                "Measure": {
                  "Expression": {
                    "SourceRef": {
                      "Entity": "Sales"
                    }
                  },
                  "Property": "Total"
                }
              },
              "queryRef": "Sales.Total",
              "nativeQueryRef": "Total Sales"
            }
          ]
        }
      },
      "sortDefinition": {
        "sort": [
          {
            "field": {
              "Measure": {
                "Expression": {
                  "SourceRef": {
                    "Entity": "Sales"
                  }
                },
                "Property": "Total"
              }
            },
            "direction": "Descending"
          }
        ],
        "isDefaultSort": true
      }
    },
    "objects": {
      "dataPoint": [
        {
          "properties": {
            "fill": {
              "solid": {
                "color": {
                  "expr": {
                    "Conditional": {
                      "Cases": [
                        {
                          "Condition": {
                            "Comparison": {
                              "ComparisonKind": 1,
                              "Left": {
                                "Measure": {
                                  "Expression": {
                                    "SourceRef": {
                                      "Entity": "Sales"
                                    }
                                  },
                                  "Property": "Total"
                                }
                              },
                              "Right": {
                                "Literal": {
                                  "Value": "100D"
                                }
                              }
                            }
                          },
                          "Value": {
                            "Literal": {
                              "Value": "'#00FF00'"
                            }
                          }
                        }
                      ],
                      "DefaultValue": {
                        "ThemeDataColor": {
                          "ColorId": 2,
                          "Percent": -0.25
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "selector": {
            "data": [
              {
                "dataViewWildcard": {
                  "matchingOption": 1
                }
              }
            ],
            "metadata": "Sales.Total"
          }
        }
      ],
      "labels": [
        {
          "properties": {
            "show": {
              "expr": {
                "Literal": {
                  "Value": "true"
                }
              }
            },
            "fontSize": {
              "expr": {
                "Literal": {
                  "Value": "12D"
                }
              }
            },
            "color": {
              "solid": {
                "color": {
                  "expr": {
                    "ThemeDataColor": {
                      "ColorId": 1,
                      "Percent": 0
                    }
                  }
                }
              }
            }
          }
        }
      ],
      "legend": [
        {
          "properties": {
            "position": {
              "expr": {
                "Literal": {
                  "Value": "1.0D"
                }
              }
            },
            "showTitle": {
              "expr": {
                "Literal": {
                  "Value": "false"
                }
              }
            }
          }
        }
      ]
    },
    "visualContainerObjects": {
      "title": [
        {
          "properties": {
            "text": {
              "expr": {
                "Literal": {
                  "Value": "'Sales by region'"
                }
              }
            }
          }
        }
      ]
    }
  },
  "filterConfig": {
    "filters": [
      {
        "name": "f1",
        "field": {
          "Column": {
            "Expression": {
              "SourceRef": {
                "Entity": "Sales"
              }
            },
            "Property": "Year"
          }
        },
        "type": "Categorical",
        "filter": {
          "Version": 2,
          "From": [
            {
              "Name": "s",
              "Entity": "Sales",
              "Type": 0
            }
          ],
          "Where": [
            {
              "Condition": {
                "In": {
                  "Expressions": [
                    {
                      "Column": {
                        "Expression": {
                          "SourceRef": {
                            "Source": "s"
                          }
                        },
                        "Property": "Year"
                      }
                    }
                  ],
                  "Values": [
                    [
                      {
                        "Literal": {
                          "Value": "2024L"
                        }
                      }
                    ],
                    [
                      {
                        "Literal": {
                          "Value": "null"
                        }
                      }
                    ]
                  ]
                }
              }
            }
          ]
        },
        "howCreated": "User"
      }
    ]
  }
}`;

const VISUAL_TS = `import { categorical, col, defaultSort, desc, double, gt, inValues, literal, long, measure, nil, obj, project, role, solid, text, theme, when, wildcard } from "@pbirkit/core/expr";

export default {
	name: "sales",
	position: { x: 0, y: 0, width: 400, height: 300 },
	visual: {
		visualType: "barChart",
		query: {
			queryState: {
				Category: role(project(col("Sales", "Region"), { active: true })),
				Y: role(project(measure("Sales", "Total"), { nativeQueryRef: "Total Sales" })),
			},
			sortDefinition: defaultSort(desc(measure("Sales", "Total"))),
		},
		objects: {
			dataPoint: obj(
				{
					fill: solid(when([[gt(measure("Sales", "Total"), double(100)), text("#00FF00")]], theme(2, -0.25))),
				},
				wildcard("Sales.Total"),
			),
			labels: obj({ show: true, fontSize: 12, color: solid(theme(1)) }),
			legend: obj({ position: literal("1.0D"), showTitle: false }),
		},
		visualContainerObjects: { title: obj({ text: "Sales by region" }) },
	},
	filterConfig: {
		filters: [
			categorical("f1", col("Sales", "Year"), {
				filter: inValues(col("Sales", "Year"), [long(2024), nil]),
				howCreated: "User",
			}),
		],
	},
} as const;
`;

it("writes a visual.json as pbirkit helper calls with --idiomatic", () => {
	const value: unknown = JSON.parse(VISUAL_JSON);
	expect(renderModule("pages/p/visuals/sales.ts", value, () => "", { idiomatic: true })).toBe(VISUAL_TS);
});

it("keeps nodes as literals where a helper call would not type check", () => {
	const value = {
		notes: { Literal: { Value: "'outer'" }, Annotations: { Literal: { Value: "'note'" } } },
		props: [
			{ properties: { Column: { Expression: { SourceRef: { Entity: "Sales" } }, Property: "Amount" } } },
		],
		sorts: { sort: [1] },
		wild: { data: [{ dataViewWildcard: { matchingOption: 3 } }] },
		paragraphs: [{ properties: { paragraphs: { expr: { Literal: { Value: "'paragraph'" } } } } }],
		zero: -0,
	};
	expect(renderModule("a.ts", value, () => "", { idiomatic: true }))
		.toBe(`import { annotate, entity, obj, text, v } from "@pbirkit/core/expr";

export default {
	notes: annotate(text("outer"), { Literal: { Value: "'note'" } }),
	props: obj({ Column: { Expression: entity("Sales"), Property: "Amount" } }),
	sorts: { sort: [1] },
	wild: { data: [{ dataViewWildcard: { matchingOption: 3 } }] },
	paragraphs: [{ properties: { paragraphs: v("paragraph") } }],
	zero: -0,
} as const;
`);
});

const literalProperty = (Value: string) => ({ expr: { Literal: { Value } } });

it("swaps ids, colours and images for members of shared modules", () => {
	const ids = {
		value: { pages: { overview: "a3f9c1d2e4b5f6a7b8c9" } },
		paths: new Map([["a3f9c1d2e4b5f6a7b8c9", ["pages", "overview"]]]),
	};
	const roles = colorRoles([{ foreground: "#252423", dataColors: ["#118DFF"] }]);
	const swaps = swapsOf(
		ids,
		new Map([["logo.png", "src/images/logo.ts"]]),
		(color) => colorName(roles, color),
		true,
	);
	const value = {
		name: "a3f9c1d2e4b5f6a7b8c9",
		fill: { solid: { color: literalProperty("'#118DFF'") } },
		line: { solid: { color: literalProperty("'#ABCDEF'") } },
		label: literalProperty("'#118DFF'"),
		sections: { a3f9c1d2e4b5f6a7b8c9: { visible: true } },
		image: {
			expr: {
				ResourcePackageItem: { PackageName: "RegisteredResources", PackageType: 1, ItemName: "logo.png" },
			},
		},
		other: {
			expr: {
				ResourcePackageItem: { PackageName: "RegisteredResources", PackageType: 1, ItemName: "missing.png" },
			},
		},
		reordered: {
			expr: {
				ResourcePackageItem: { ItemName: "logo.png", PackageName: "RegisteredResources", PackageType: 1 },
			},
		},
		filter: {
			Version: 2,
			From: [{ Name: "x", Entity: "Sales", Type: 0 }],
			Where: [
				{
					Condition: {
						Not: {
							Expression: {
								In: {
									Expressions: [
										{ Column: { Expression: { SourceRef: { Source: "x" } }, Property: "Region" } },
									],
									Values: [[literalProperty("'East'").expr]],
								},
							},
						},
					},
				},
			],
		},
	};
	expect(renderModule("src/pages/p/index.ts", value, () => "", { idiomatic: true, swaps }))
		.toBe(`import { col, imageRef, notIn, solid, v } from "@pbirkit/core/expr";
import ids from "../../ids.ts";
import palette from "../../palette.ts";
import _logo from "../../images/logo.ts";

export default {
	name: ids.pages.overview,
	fill: solid(palette.data1),
	line: solid(palette.hexABCDEF),
	label: v("#118DFF"),
	sections: { [ids.pages.overview]: { visible: true } },
	image: v(imageRef(_logo)),
	other: v({
		ResourcePackageItem: { PackageName: "RegisteredResources", PackageType: 1, ItemName: "missing.png" },
	}),
	reordered: v({
		ResourcePackageItem: { ItemName: "logo.png", PackageName: "RegisteredResources", PackageType: 1 },
	}),
	filter: notIn(col("Sales", "Region"), ["East"], "x"),
} as const;
`);
});

it("points bookmark ids at page and visual modules and qualifies clashing imports", () => {
	const page = "a3f9c1d2e4b5f6a7b8c9";
	const card = "b4f9c1d2e4b5f6a7b8c9";
	const other = "c5f9c1d2e4b5f6a7b8c9";
	const ids = {
		value: {},
		paths: new Map([
			[page, ["pages", "overview"]],
			[card, ["visuals", "overview", "card"]],
			[other, ["visuals", "detail", "card"]],
		]),
	};
	const targets = new Map([
		[page, "src/pages/overview/index.ts"],
		[card, "src/pages/overview/visuals/card.ts"],
		[other, "src/pages/detail/visuals/card.ts"],
	]);
	const swaps = swapsOf(ids, new Map(), (color) => color, true, targets);
	const value = {
		activeSection: page,
		sections: { [page]: { visualContainers: { [card]: {}, [other]: {} } } },
	};

	expect(renderModule("src/bookmarks/b.ts", value, () => "", { idiomatic: true, swaps }))
		.toBe(`import _overview from "../pages/overview/index.ts";
import _card from "../pages/overview/visuals/card.ts";
import _detailCard from "../pages/detail/visuals/card.ts";

export default {
	activeSection: _overview.name,
	sections: { [_overview.name]: { visualContainers: { [_card.name]: {}, [_detailCard.name]: {} } } },
} as const;
`);
});

it("names ids and colours as dotted keys without clashes", () => {
	expect(keyOf(wordsOf("2.1 - Executive Summary"))).toBe("_21ExecutiveSummary");
	expect(keyOf(wordsOf("KPI card"))).toBe("kpiCard");
	expect(keyOf(wordsOf("Café milestoneTable"))).toBe("cafeMilestoneTable");

	const scope = nameScope(["index"]);
	expect(scope(wordsOf("Index"))).toEqual({ file: "index-2", key: "index2" });
	expect(scope(wordsOf("KPI card"))).toEqual({ file: "kpi-card", key: "kpiCard" });
	expect(scope(wordsOf("kpi-Card"))).toEqual({ file: "kpi-card-2", key: "kpiCard2" });
	expect(scope(["card"], true)).toEqual({ file: "card-1", key: "card1" });
	expect(scope(["a".repeat(70)]).file).toHaveLength(64);
	expect(scope(wordsOf(`${"word ".repeat(20)}end`)).file).toBe(
		Array.from({ length: 13 }, () => "word").join("-"),
	);

	const roles = colorRoles([{ foreground: "#000000" }, { foreground: "#111111", dataColors: ["#000000"] }]);
	expect([...roles]).toEqual([["#000000", "foreground"]]);
	expect(colorName(roles, "#111111")).toBe("hex111111");
});
