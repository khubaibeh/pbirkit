import { expect, it } from "vite-plus/test";

import { renderModule } from "./modules.ts";

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

const VISUAL_TS = `import { alias, categorical, col, defaultSort, desc, double, filterDef, from, gt, isIn, literal, long, measure, nil, obj, project, role, solid, text, theme, when, wildcard } from "@pbirkit/core/expr";

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
				filter: filterDef([from("s", "Sales")], isIn([col(alias("s"), "Year")], [[long(2024)], [nil]])),
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
